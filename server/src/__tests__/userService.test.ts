import sinon from "sinon";
import { expect } from "@jest/globals";
import userService from "../services/userService";
import { UserModel } from "../models/user";
import bcrypt from "bcrypt";
import { BadRequestError, NotFoundError } from "../errors/ApiError";
import { userData } from "./helper/userHelper";
import { IUser } from "../interfaces/IUser";
import { UserRole } from "../enums/UserRole";

describe("UserService", () => {
  afterEach(() => {
    sinon.restore();
  });

  describe("createUser", () => {
    // Mock User object
    const mockUser = {
      ...userData,
      save: sinon.stub().resolves(this),
    };
    let findOneStub: sinon.SinonStub;

    beforeEach(() => {
      findOneStub = sinon.stub(UserModel, "findOne");
    });

    it("should create a new user if the email is not already in use", async () => {
      // Set up the test to simulate no existing user
      findOneStub.resolves(null);
      const userSaveStub = sinon
        .stub(UserModel.prototype, "save")
        .resolves(mockUser);
      const result = await userService.createUser(userData);

      expect(result).toEqual(mockUser);
      expect(findOneStub.calledOnce).toBeTruthy();
      expect(userSaveStub.calledOnce).toBeTruthy();
    });

    it("should throw a BadRequestError if the email is already in use", async () => {
      // Set up the test to simulate an existing user
      findOneStub.resolves(mockUser);

      await expect(userService.createUser(userData)).rejects.toThrow(
        BadRequestError
      );
      expect(findOneStub.calledOnce).toBeTruthy();
    });
  });

  describe("updateUserPassword", () => {
    let findByIdStub: sinon.SinonStub;
    let bcryptHashStub: sinon.SinonStub;
    let mockUserSaveStub: sinon.SinonStub;

    const mockUser = {
      _id: "66f810ce766adcd06ab40c12",
      name: "John Doe",
      email: "john@example.com",
      password: "OldPassword123",
      save: sinon.stub().resolvesThis(), // Ensure that save resolves the mockUser itself
    };

    beforeEach(() => {
      findByIdStub = sinon.stub(UserModel, "findById").resolves(mockUser);
      bcryptHashStub = sinon.stub(bcrypt, "hash").resolves("hashedPassword123");
      // Mock save method for user
      mockUserSaveStub = mockUser.save.resolves(mockUser);
    });

    it("should update the user's password when valid", async () => {
      const result = await userService.updateUserPassword(
        "66f810ce766adcd06ab40c12",
        "OldPassword123",
        "NewPassword123!"
      );

      // The password should have been updated to the hashed password
      expect(result.password).toEqual("hashedPassword123");
      expect(findByIdStub.calledOnce).toBeTruthy();
      expect(bcryptHashStub.calledOnce).toBeTruthy();
      expect(mockUserSaveStub.calledOnce).toBeTruthy();
    });

    it("should throw NotFoundError if the user is not found", async () => {
      // Simulate the user not being found
      findByIdStub.resolves(null);

      // Expect the service to throw a NotFoundError
      await expect(
        userService.updateUserPassword(
          "invalidId",
          "OldPassword123",
          "NewPassword123!"
        )
      ).rejects.toThrow(NotFoundError);
      expect(findByIdStub.calledOnce).toBeTruthy();
    });

    it("should throw BadRequestError if new or current passwords are missing", async () => {
      // Simulate a valid user being found
      findByIdStub.resolves(mockUser);

      // Expect the service to throw BadRequestError when no newPassword is provided
      await expect(
        userService.updateUserPassword(
          "66f810ce766adcd06ab40c12",
          "",
          "NewPassword123!"
        )
      ).rejects.toThrow(BadRequestError);

      await expect(
        userService.updateUserPassword(
          "66f810ce766adcd06ab40c12",
          "OldPassword123",
          ""
        )
      ).rejects.toThrow(BadRequestError);

      expect(findByIdStub.calledTwice).toBeTruthy();
    });
  });

  describe("findUserById", () => {
    // Mock User object with events
    const mockUser = {
      _id: "66f810ce766adcd06ab40c12",
      name: "John Doe",
      email: "john@example.com",
      events: [{ name: "Sample Event" }],
    };

    let findByIdStub: sinon.SinonStub;
    let populateStub: sinon.SinonStub;

    beforeEach(() => {
      populateStub = sinon.stub().resolves(mockUser);
      // Mock findById to return an object with a populate function
      findByIdStub = sinon.stub(UserModel, "findById").returns({
        populate: populateStub,
      } as any);
    });

    it("should return the user with populated events if found", async () => {
      const result = await userService.findUserById("66f810ce766adcd06ab40c12");

      expect(result).toEqual(mockUser);
      expect(findByIdStub.calledOnce).toBeTruthy();
      expect(populateStub.calledOnce).toBeTruthy();
    });

    it("should throw NotFoundError if user ID is invalid (empty)", async () => {
      await expect(userService.findUserById("")).rejects.toThrow(NotFoundError);
      expect(findByIdStub.called).toBeFalsy();
    });

    it("should throw NotFoundError if the user is not found", async () => {
      // Simulate the case where no user is found
      findByIdStub.returns({
        populate: sinon.stub().resolves(null),
      } as any);

      await expect(
        userService.findUserById("66f810ce766adcd06ab40c12")
      ).rejects.toThrow(NotFoundError);
      expect(findByIdStub.calledOnce).toBeTruthy();
    });
  });

  describe("updateUser", () => {
    let findByIdAndUpdateStub: sinon.SinonStub;

    const mockUser: Partial<IUser> = {
      _id: "66f810ce766adcd06ab40c12",
      name: "John Doe",
      email: "john@example.com",
      password: "Password123!",
      role: UserRole.User,
    };

    beforeEach(() => {
      findByIdAndUpdateStub = sinon.stub(UserModel, "findByIdAndUpdate");
    });

    it("should update the user successfully", async () => {
      // Setup the stub to return a mock user when called
      findByIdAndUpdateStub.resolves(mockUser);

      const updatedData = { name: "Updated Name" };

      const result = await userService.updateUser(
        mockUser._id as string,
        updatedData
      );

      // Check that the user is updated and returned
      expect(result).toEqual(mockUser);
      expect(findByIdAndUpdateStub.calledOnce).toBeTruthy();
      expect(
        findByIdAndUpdateStub.calledWith(mockUser._id, updatedData, {
          new: true,
        })
      ).toBeTruthy();
    });

    it("should throw NotFoundError if the user does not exist", async () => {
      // Setup the stub to return null when no user is found
      findByIdAndUpdateStub.resolves(null);

      const updatedData = { name: "Updated Name" };

      await expect(
        userService.updateUser("invalidId", updatedData)
      ).rejects.toThrow(NotFoundError);
      expect(findByIdAndUpdateStub.calledOnce).toBeTruthy();
      expect(
        findByIdAndUpdateStub.calledWith("invalidId", updatedData, {
          new: true,
        })
      ).toBeTruthy();
    });

    it("should propagate any error thrown by findByIdAndUpdate", async () => {
      // Setup the stub to throw an error
      findByIdAndUpdateStub.rejects(new Error("Database error"));

      const updatedData = { name: "Updated Name" };

      await expect(
        userService.updateUser(mockUser._id as string, updatedData)
      ).rejects.toThrow("Database error");
      expect(findByIdAndUpdateStub.calledOnce).toBeTruthy();
    });
  });

  describe("deleteUser", () => {
    let findByIdAndDeleteStub: sinon.SinonStub;

    const mockUser: Partial<IUser> = {
      _id: "66f810ce766adcd06ab40c12",
      name: "John Doe",
      email: "john@example.com",
      password: "Password123!",
      role: UserRole.User,
    };

    beforeEach(() => {
      findByIdAndDeleteStub = sinon.stub(UserModel, "findByIdAndDelete");
    });

    it("should delete the user successfully", async () => {
      // Setup the stub to return a mock user when called
      findByIdAndDeleteStub.resolves(mockUser);

      await userService.deleteUser(mockUser._id as string);

      expect(findByIdAndDeleteStub.calledOnce).toBeTruthy();
      expect(findByIdAndDeleteStub.calledWith(mockUser._id)).toBeTruthy();
    });

    it("should throw NotFoundError if the user does not exist", async () => {
      // Setup the stub to return null when no user is found
      findByIdAndDeleteStub.resolves(null);

      await expect(userService.deleteUser("invalidId")).rejects.toThrow(
        NotFoundError
      );
      expect(findByIdAndDeleteStub.calledOnce).toBeTruthy();
      expect(findByIdAndDeleteStub.calledWith("invalidId")).toBeTruthy();
    });

    it("should propagate any error thrown by findByIdAndDelete", async () => {
      // Setup the stub to throw an error
      findByIdAndDeleteStub.rejects(new Error("Database error"));

      await expect(
        userService.deleteUser(mockUser._id as string)
      ).rejects.toThrow("Database error");
      expect(findByIdAndDeleteStub.calledOnce).toBeTruthy();
    });
  });

  // TO-DO: write fetchAllUsers with paginations
  // Error:   Received: {"exec": [Function functionStub], "limit": [Function functionStub], "skip": [Function functionStub]}
  // describe("fetchAllUsers", () => {
  //   let findStub: sinon.SinonStub;
  //   let countDocumentsStub: sinon.SinonStub;

  //   const mockUsers: Partial<IUser>[] = [
  //     {
  //       _id: "66ead78b49bac489378931f4",
  //       name: "John Doe",
  //       email: "john@example.com",
  //       password: "Password123!",
  //       role: UserRole.User,
  //       events: [],
  //     },
  //     {
  //       _id: "66ead78b49bac489378931f2",
  //       name: "Jane Smith",
  //       email: "jane@example.com",
  //       password: "Password123!",
  //       role: UserRole.User,
  //       events: [],
  //     },
  //   ];

  //   beforeEach(() => {
  //     // Mock the full query chain (skip, limit, exec)
  //     const queryMock = {
  //       skip: sinon.stub().returnsThis(),
  //       limit: sinon.stub().returnsThis(),
  //       // Mock exec() to return the mockUsers array
  //       exec: sinon.stub().resolves(mockUsers),
  //     };

  //     findStub = sinon.stub(UserModel, "find").returns(queryMock as any);
  //     countDocumentsStub = sinon.stub(UserModel, "countDocuments").resolves(2);
  //   });

  //   it("should return all users with pagination", async () => {
  //     const result = await userService.fetchAllUsers(1, 10);

  //     expect(result.users).toEqual(mockUsers);
  //     expect(result.total).toEqual(2);
  //     expect(findStub.calledOnce).toBeTruthy();
  //     expect(countDocumentsStub.calledOnce).toBeTruthy();
  //   });
  // });
});
