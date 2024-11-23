const supertest = require("supertest");
const mongoose = require("mongoose");
const app = require("../server");

let server;
let adminToken; //To store the token for admin account

//Start the server before each test

beforeAll(() => {
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    throw new Error(
      "Environment variables ADMIN_EMAIL and ADMIN_PASSWORD must be defined"
    );
  }
  server = app.listen(5000);
});

//Clean up the database connection after all tests
afterAll(async () => {
  console.log("MongoDB connection closing...");
  await mongoose.connection.close();
  await server.close();
});

describe("GET Request to Users API", () => {
  beforeAll(async () => {
    const adminCredentials = {
      email: process.env.ADMIN_EMAIL, //Admin email
      password: process.env.ADMIN_PASSWORD, //Admin password
    };

    const response = await supertest(server)
      .post("/api/v1/auth/login")
      .send(adminCredentials);

    //Store the token for subsequent requests
    adminToken = response.body.token;
  });

  //GET Request for fetching all users in the database as admin
  it("should fetch all users when logged in as admin", async () => {
    const response = await supertest(server)
      .get("/api/v1/users")
      .set("Authorization", `Bearer ${adminToken}`); //Attach admin JWT token

    //Assertions
    expect(response.status).toBe(200); //HTTP status for success
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);

    //Verify a sample user's structure
    const sampleUser = response.body.data[0];
    expect(sampleUser).toHaveProperty("_id");
    expect(sampleUser).toHaveProperty("name");
    expect(sampleUser).toHaveProperty("email");
    expect(sampleUser).toHaveProperty("role");
  });

  //GET Request for fetching all users in the database (in case of error: Unauthorized access)
  it("should return a 403 error when a user tries to access this route", async () => {
    const userCredentials = {
      email: "greg@gmail.com",
      password: process.env.GREG_PASSWORD,
    };
    const userLogin = await supertest(server)
      .post("/api/v1/auth/login")
      .send(userCredentials);
    const userToken = userLogin.body.token;
    const response = await supertest(server)
      .get("/api/v1/users")
      .set("Authorization", `Bearer ${userToken}`); //Attach user token

    //Assertions
    expect(response.status).toBe(403); //Forbidden
    expect(response.body.success).toBe(false);
    expect(response.body).toHaveProperty(
      "error",
      "User role user is not authorized to access this route"
    );
  });

  //GET Request for fetching all users in the database (in case of error: Unauthorized access)
  it("should return a 403 error when a publisher tries to access this route", async () => {
    const publisherCredentials = {
      email: "sasha@gmail.com", // Replace with an actual publisher email
      password: process.env.SASHA_PASSWORD, // Replace with the publisher's password
    };
    const publisherLogin = await supertest(server)
      .post("/api/v1/auth/login")
      .send(publisherCredentials);

    const publisherToken = publisherLogin.body.token;
    const response = await supertest(server)
      .get("/api/v1/users") // Endpoint for getting all users
      .set("Authorization", `Bearer ${publisherToken}`); // Attach publisher token

    // Assertions
    expect(response.status).toBe(403); // Forbidden
    expect(response.body.success).toBe(false);
    expect(response.body).toHaveProperty(
      "error",
      "User role publisher is not authorized to access this route"
    );
  });

  //GET Request for fetching user by ID
  it("should fetch a single user when a valid ID is provided", async () => {
    const validUserId = process.env.VALID_USER_ID; //A valid user ID in MongoDB
    const response = await supertest(server)
      .get(`/api/v1/users/${validUserId}`)
      .set("Authorization", `Bearer ${adminToken}`); //Attach admin JWT token

    //Assertions
    expect(response.status).toBe(200); //HTTP status for success
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty("_id", validUserId);
    expect(response.body.data).toHaveProperty("name", "Sasha Ryan");
  });

  //GET Request for fetching user by ID (in case of error: non-existent ID)
  it("should return null data for a non-existent ID", async () => {
    const nonExistentId = new mongoose.Types.ObjectId(); //Generate a random ObjectId
    const response = await supertest(server)
      .get(`/api/v1/users/${nonExistentId}`)
      .set("Authorization", `Bearer ${adminToken}`); //Attach admin JWT token

    //Assertions
    expect(response.status).toBe(200); //HTTP status for success
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeNull(); //Data should be null for non-existent ID
  });
});

describe("POST, PUT and DELETE Requests to Users API", () => {
  let userIdToUpdate;
  let userIdToDelete;
  //POST Request to Users API for creating a user (in case of error)
  it("should return a 400 error when a required field is missing", async () => {
    const incompleteUser = {
      name: "Samantha Jones",
      email: "samantha@gmail.com",
      //Missing password
    };
    const response = await supertest(server)
      .post("/api/v1/users")
      .set("Authorization", `Bearer ${adminToken}`) //Attach admin JWT token
      .send(incompleteUser);

    //Assertions
    expect(response.status).toBe(400); //HTTP status for bad request
    expect(response.body.success).toBe(false);
    expect(response.body).toHaveProperty("error", "Please add a password");
  });

  //POST Request to Users API for creating a user
  it("should successfully create a new user", async () => {
    const newUser = {
      name: "Natalie Jones",
      email: "natalie@gmail.com",
      password: process.env.NATALIE_PASSWORD,
    };

    const response = await supertest(server)
      .post("/api/v1/users")
      .set("Authorization", `Bearer ${adminToken}`) //Attach admin JWT token
      .send(newUser);

    //Storing the user ID of the newly created user
    userIdToUpdate = response.body.data._id;
    userIdToDelete = response.body.data._id;

    //Assertions
    expect(response.status).toBe(201); //HTTP status for resource creation
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty("_id");
    expect(response.body.data).toHaveProperty("name", newUser.name);
    expect(response.body.data).toHaveProperty("email", newUser.email);
    expect(response.body.data).toHaveProperty("role", "user");
  });

  //POST Request to Users API for creating a user (in case of erorr: Duplicate email error)
  it("should return a 400 error when a user with the same email is created", async () => {
    const duplicateUser = {
      name: "Natalie Jones",
      email: "natalie@gmail.com", //Duplicate email
      password: process.env.NATALIE_PASSWORD,
    };
    const response = await supertest(server)
      .post("/api/v1/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(duplicateUser);

    //Assertions
    expect(response.status).toBe(400); //HTTP status for bad request
    expect(response.body.success).toBe(false);
    expect(response.body).toHaveProperty(
      "error",
      "Duplicate field value entered"
    );
  });

  //PUT Request to Users API for updating a user
  it("should successfully update a user's name", async () => {
    const updatedData = {
      name: "Natalie J",
    };
    const response = await supertest(server)
      .put(`/api/v1/users/${userIdToUpdate}`)
      .set("Authorization", `Bearer ${adminToken}`) //Attaach admin JWT token
      .send(updatedData);

    //Assertions
    expect(response.status).toBe(200); //HTTP status for success
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty("_id", userIdToUpdate);
    expect(response.body.data).toHaveProperty("name", updatedData.name);
    expect(response.body.data).toHaveProperty("email", "natalie@gmail.com");
  });

  //PUT Request to Users API for updating a user (in case of error: non-existent user)
  it("should return null data when a non-existent ID is used", async () => {
    const updatedData = {
      name: "Non-existent User",
    };
    const nonExistentId = new mongoose.Types.ObjectId(); //Generate a random ObjectId
    const response = await supertest(server)
      .put(`/api/v1/users/${nonExistentId}`)
      .set("Authorization", `Bearer ${adminToken}`) //Attach admin JWT token
      .send(updatedData);

    //Assertions
    expect(response.status).toBe(200); //HTTP status for success
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeNull(); //Data should be null for non-existent ID
  });

  //DELETE Request to Users API for delete a user
  it("should successfully delete a user", async () => {
    const response = await supertest(server)
      .delete(`/api/v1/users/${userIdToDelete}`)
      .set("Authorization", `Bearer ${adminToken}`); //Attach admin JWT token

    //Assertions
    expect(response.status).toBe(200); //HTTP status for success
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual({}); //Data should be empty
  });

  //DELETE Request to Users API for deleting a user (in case of error: non-existent user)
  it("should return a 404 error when a non-existent ID is used", async () => {
    const nonExistentId = new mongoose.Types.ObjectId(); //Generate a random ObjectID
    const response = await supertest(server)
      .delete(`/api/v1/users/${nonExistentId}`)
      .set("Authorization", `Bearer ${adminToken}`); //Attach admin JWT token

    //Assertions
    expect(response.status).toBe(404); //HTTP status for resource not found
    expect(response.body.success).toBe(false);
    expect(response.body).toHaveProperty("error", "Resource not found");
  });
});
