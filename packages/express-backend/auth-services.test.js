import { jest } from "@jest/globals";
import jwt from "jsonwebtoken";
import authServices from "./auth-services.js";
import userModel from "./user.js";

describe("Auth Services Test Suite", () => {

  beforeEach(() => {
    jest.clearAllMocks();

    userModel.findOne = jest.fn();

    jest.spyOn(userModel.prototype, "save").mockReturnThis();
  });

  test("Testing hashPassword -- pass", () => {

    const hash = authServices.hashPassword("password123");

    expect(hash).not.toBe("password123");
    expect(typeof hash).toBe("string");
  });

  test("Testing registerUser -- pass", async () => {

    const userData = {
      email: "TEST@GMAIL.COM",
      password: "password123",
      display_name: "Tester",
      role: "musician",
    };

    userModel.prototype.save = jest.fn().mockResolvedValue(userData);

    const result = await authServices.registerUser(userData);

    expect(result).toEqual(userData);

    expect(userModel.prototype.save).toHaveBeenCalled();
  });

  test("Testing authenticateUser no user found -- fail", async () => {

    userModel.findOne.mockResolvedValue(null);

    const result = await authServices.authenticateUser({
      email: "test@gmail.com",
      password: "password123",
    });

    expect(result).toBeNull();
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
      email: "test@gmail.com",
      password_hash: authServices.hashPassword("password123"),
    };

    userModel.findOne.mockResolvedValue(mockUser);

    const result = await authServices.authenticateUser({
      email: "test@gmail.com",
      password: "password123",
    });

    expect(result).toEqual(mockUser);
  });

  test("Testing createAccessToken -- pass", () => {

    const user = {
      _id: "123",
      email: "test@gmail.com",
      display_name: "Tester",
      role: "musician",
      email_verified: false,
    };

    const token = authServices.createAccessToken(user);

    expect(typeof token).toBe("string");
  });

  test("Testing verifyAccessToken -- pass", () => {

    const token = jwt.sign(
      {
        sub: "123",
      },
      process.env.JWT_SECRET || "dev-jwt-secret-change-me"
    );

    const decoded = authServices.verifyAccessToken(token);

    expect(decoded.sub).toBe("123");
  });

});