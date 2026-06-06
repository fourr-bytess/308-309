import { jest } from "@jest/globals";
import jwt from "jsonwebtoken";
import authServices from "./auth-services.js";
import userModel from "./user.js";

describe("Auth Services Test Suite", () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();

    process.env = { ...ORIGINAL_ENV };
    delete process.env.JWT_SECRET;

    userModel.findOne = jest.fn();
    userModel.findById = jest.fn();

    jest.spyOn(userModel.prototype, "save").mockImplementation(function () {
      return Promise.resolve(this);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env = { ...ORIGINAL_ENV };
  });

  describe("hashPassword", () => {
    test("Testing hashPassword creates a hash -- pass", () => {
      const hash = authServices.hashPassword("password123");

      expect(hash).not.toBe("password123");
      expect(typeof hash).toBe("string");
      expect(hash.length).toBeGreaterThan(0);
    });

    test("Testing hashPassword is deterministic for the same password -- pass", () => {
      const hashOne = authServices.hashPassword("samePassword");
      const hashTwo = authServices.hashPassword("samePassword");

      expect(hashOne).toBe(hashTwo);
    });
  });

  describe("registerUser", () => {
    test("Testing registerUser normalizes email, trims display name, and saves user -- pass", async () => {
      const userData = {
        email: " TEST@GMAIL.COM ",
        password: "password123",
        display_name: " Tester ",
        role: "musician",
      };

      const result = await authServices.registerUser(userData);

      expect(result.email).toBe("test@gmail.com");
      expect(result.display_name).toBe("Tester");
      expect(result.role).toBe("musician");
      expect(result.password_hash).toBe(authServices.hashPassword("password123"));
      expect(result.password_hash).not.toBe("password123");

      expect(userModel.prototype.save).toHaveBeenCalled();
    });
  });

  describe("findUserByEmail", () => {
    test("Testing findUserByEmail normalizes email before query -- pass", async () => {
      const mockUser = {
        _id: "user123",
        email: "test@gmail.com",
      };

      userModel.findOne.mockResolvedValue(mockUser);

      const result = await authServices.findUserByEmail(" TEST@GMAIL.COM ");

      expect(result).toEqual(mockUser);
      expect(userModel.findOne).toHaveBeenCalledWith({
        email: "test@gmail.com",
      });
    });

    test("Testing findUserByEmail with empty email -- pass", async () => {
      userModel.findOne.mockResolvedValue(null);

      const result = await authServices.findUserByEmail("");

      expect(result).toBeNull();
      expect(userModel.findOne).toHaveBeenCalledWith({
        email: "",
      });
    });

    test("Testing findUserByEmail with null email -- pass", async () => {
      userModel.findOne.mockResolvedValue(null);

      const result = await authServices.findUserByEmail(null);

      expect(result).toBeNull();
      expect(userModel.findOne).toHaveBeenCalledWith({
        email: "",
      });
    });
  });

  describe("findUserById", () => {
    test("Testing findUserById returns null when id is missing -- pass", async () => {
      const result = await authServices.findUserById();

      expect(result).toBeNull();
      expect(userModel.findById).not.toHaveBeenCalled();
    });

    test("Testing findUserById returns user when id is provided -- pass", async () => {
      const mockUser = {
        _id: "user123",
        email: "test@gmail.com",
      };

      userModel.findById.mockResolvedValue(mockUser);

      const result = await authServices.findUserById("user123");

      expect(result).toEqual(mockUser);
      expect(userModel.findById).toHaveBeenCalledWith("user123");
    });
  });

  describe("authenticateUser", () => {
    test("Testing authenticateUser no user found -- fail", async () => {
      userModel.findOne.mockResolvedValue(null);

      const result = await authServices.authenticateUser({
        email: "test@gmail.com",
        password: "password123",
      });

      expect(result).toBeNull();
      expect(userModel.findOne).toHaveBeenCalledWith({
        email: "test@gmail.com",
      });
    });

    test("Testing authenticateUser invalid password -- fail", async () => {
      userModel.findOne.mockResolvedValue({
        password_hash: authServices.hashPassword("correctPassword"),
      });

      const result = await authServices.authenticateUser({
        email: "test@gmail.com",
        password: "wrongPassword",
      });

      expect(result).toBeNull();
    });

    test("Testing authenticateUser valid credentials -- pass", async () => {
      const mockUser = {
        _id: "user123",
        email: "test@gmail.com",
        password_hash: authServices.hashPassword("password123"),
      };

      userModel.findOne.mockResolvedValue(mockUser);

      const result = await authServices.authenticateUser({
        email: " TEST@GMAIL.COM ",
        password: "password123",
      });

      expect(result).toEqual(mockUser);
      expect(userModel.findOne).toHaveBeenCalledWith({
        email: "test@gmail.com",
      });
    });
  });

  describe("createAccessToken and verifyAccessToken", () => {
    test("Testing createAccessToken creates valid token with default secret -- pass", () => {
      const user = {
        _id: "123",
        email: "test@gmail.com",
        display_name: "Tester",
        role: "musician",
        email_verified: false,
      };

      const token = authServices.createAccessToken(user);
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "dev-jwt-secret-change-me"
      );

      expect(typeof token).toBe("string");
      expect(decoded.sub).toBe("123");
      expect(decoded.email).toBe("test@gmail.com");
      expect(decoded.display_name).toBe("Tester");
      expect(decoded.role).toBe("musician");
      expect(decoded.email_verified).toBe(false);
    });

    test("Testing createAccessToken converts email_verified to boolean -- pass", () => {
      const user = {
        _id: 456,
        email: "verified@gmail.com",
        display_name: "Verified User",
        role: "venue",
        email_verified: 1,
      };

      const token = authServices.createAccessToken(user);
      const decoded = authServices.verifyAccessToken(token);

      expect(decoded.sub).toBe("456");
      expect(decoded.email_verified).toBe(true);
    });

    test("Testing verifyAccessToken works with default secret -- pass", () => {
      const token = jwt.sign(
        {
          sub: "123",
        },
        "dev-jwt-secret-change-me"
      );

      const decoded = authServices.verifyAccessToken(token);

      expect(decoded.sub).toBe("123");
    });

    test("Testing createAccessToken and verifyAccessToken with custom JWT_SECRET -- pass", () => {
      process.env.JWT_SECRET = "custom-test-secret";

      const user = {
        _id: "custom123",
        email: "custom@gmail.com",
        display_name: "Custom Tester",
        role: "band",
        email_verified: true,
      };

      const token = authServices.createAccessToken(user);
      const decoded = authServices.verifyAccessToken(token);

      expect(decoded.sub).toBe("custom123");
      expect(decoded.email).toBe("custom@gmail.com");
      expect(decoded.role).toBe("band");
      expect(decoded.email_verified).toBe(true);
    });

    test("Testing verifyAccessToken rejects invalid token -- fail", () => {
      expect(() => {
        authServices.verifyAccessToken("invalid.token.value");
      }).toThrow();
    });
  });
});