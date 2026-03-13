import { expect, jest } from "@jest/globals";
import messageModel from "./messages.js";
import messageServices from "./message-services.js";

describe("Message Services Test Suite", () => {

  beforeEach(() => {
    jest.clearAllMocks();
    messageModel.find = jest.fn();
    messageModel.findById = jest.fn();
    messageModel.findByIdAndDelete = jest.fn();
    jest.spyOn(messageModel.prototype, "save").mockReturnThis();
  });

  describe("getMessages", () => {
    test("should call find with correct conversationId", async () => {
      messageModel.find.mockResolvedValue([]);

      await messageServices.getMessages("123");

      expect(messageModel.find).toHaveBeenCalledWith({
        conversationId: "123"
      });
    });
  });

  describe("CRUD operations", () => {

    test("addMessage -- success", async () => {
      const messageData = { text: "Hello" };

      messageModel.prototype.save = jest.fn().mockResolvedValue(messageData);

      const result = await messageServices.addMessage(messageData);

      expect(result).toEqual(messageData);
      expect(messageModel.prototype.save).toHaveBeenCalled();
    });

    test("findMessageById -- success", async () => {
      messageModel.findById.mockResolvedValue({ text: "Hi" });

      await messageServices.findMessageById("111");

      expect(messageModel.findById).toHaveBeenCalledWith("111");
    });

    test("findMessageByIdAndDelete -- success", async () => {
      messageModel.findByIdAndDelete.mockResolvedValue({ success: true });

      await messageServices.findMessageByIdAndDelete("111");

      expect(messageModel.findByIdAndDelete).toHaveBeenCalledWith("111");
    });

  });

});