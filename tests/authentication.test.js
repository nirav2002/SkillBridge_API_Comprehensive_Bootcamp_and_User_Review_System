const supertest = require("supertest");
const mongoose = require("mongoose");
const app = require("../server");
const User = require("../models/User");

let server;

//Start the server before each test
beforeEach(() => {
  server = app.listen(5000);
});

//Stop the server after each test
afterEach(async () => {
  await server.close();
});

//Clean up the database connection after all tests
afterAll(async () => {
  console.log("MongoDB connection closing...");

  //Delete the test user created during the tests
  await User.deleteOne({ email: process.env.USER_EMAIL });

  await mongoose.connection.close();
});

describe("Authentication API Requests", () => {
  let registeredUser = {}; //Store the user data for login
  let token; //Store the JWT token from the logged-in user

  //POST Request to Authentication API for Resgistering a User
  it("should successfully register a user and return a token", async () => {
    const userData = {
      name: "Test User",
      email: process.env.USER_EMAIL,
      password: process.env.USER_PASSWORD,
      role: "publisher", //Default is user if nothing is specified
    };
    const response = await supertest(server)
      .post("/api/v1/auth/register")
      .send(userData);

    //Storing token, userId email and password for subsequent tests
    token = response.body.token;

    registeredUser.email = userData.email;
    registeredUser.password = userData.password;

    //Assertions
    expect(response.status).toBe(201); //HTTP status for successful creation
    expect(response.body.success).toBe(true);
    expect(response.body).toHaveProperty("token"); //Ensure token is returned
  });

  //POST Request to Authentication API for Registering a User (in case of error: Missing fields)
  it("should return a 400 error if required fields are missing", async () => {
    const incompleteUserData = {
      //Missing required fields like name
      email: "incomplete@example.com",
      password: "incompletepassword",
    };

    const response = await supertest(server)
      .post("/api/v1/auth/register")
      .send(incompleteUserData);

    //Assertions
    expect(response.status).toBe(400); //HTTP status for bad request
    expect(response.body.success).toBe(false);
    expect(response.body).toHaveProperty("error");
  });

  //POST Request to Authentication API for Login
  it("should successfully login a user and return a token", async () => {
    const loginDetails = {
      email: registeredUser.email,
      password: registeredUser.password,
    };
    const response = await supertest(server)
      .post("/api/v1/auth/login")
      .send(loginDetails);

    //Assertions
    expect(response.status).toBe(200); //HTTP status for successful login
    expect(response.body.success).toBe(true);
    expect(response.body).toHaveProperty("token"); //Ensure token is returned
  });

  //POST Request to Authentication API for login (in case of error: Invalid Credentials)
  it("should return a 401 error for invalid credentials", async () => {
    const invalidLoginDetails = {
      email: registeredUser.email,
      password: "wrongpassword", //Incorrect password
    };
    const response = await supertest(server)
      .post("/api/v1/auth/login")
      .send(invalidLoginDetails);

    //Assertions
    expect(response.status).toBe(401); //HTTP status for unauthorized request
    expect(response.body.success).toBe(false);
    expect(response.body).toHaveProperty("error", "Invalid credentials");
  });

  //GET Request to fetch logged-in user details via token
  it("should return the logged-in user's details using the token", async () => {
    const response = await supertest(server)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`); //Pass the token as authorization

    //Assertions
    expect(response.status).toBe(200); //HTTP status for successful request
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty("_id");
    expect(response.body.data).toHaveProperty("name", "Test User");
    expect(response.body.data).toHaveProperty("email", "testuser@example.com");
    expect(response.body.data).toHaveProperty("role", "publisher");
  });

  //GET Request to fetch logged-in user details via token (in case of error: missing or invalid token)
  it("should return a 401 error if no token is provided", async () => {
    const response = await supertest(server).get("/api/v1/auth/me");

    //Assertions
    expect(response.status).toBe(401); //HTTP status for unauthorized access
    expect(response.body.success).toBe(false);
    expect(response.body).toHaveProperty(
      "error",
      "Not authorized to access this route"
    );
  });

  //PUT Request to update user details
  it("should successfully update the user's details", async () => {
    const updateUserDetails = {
      name: "Test User Updated",
    };
    const response = await supertest(server)
      .put("/api/v1/auth/updatedetails")
      .set("Authorization", `Bearer ${token}`) //Attach JWT token
      .send(updateUserDetails);

    //Assertions
    expect(response.status).toBe(200); //HTTP status for success
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty("name", updateUserDetails.name);
  });

  //PUT Request to update user details (in case of error: duplicate email)
  it("should return a 400 error when updating with a duplicate email", async () => {
    const duplicateDetails = {
      email: "bryce@gmail.com", //A user in the database
    };
    const response = await supertest(server)
      .put("/api/v1/auth/updatedetails")
      .set("Authorization", `Bearer ${token}`) //Attach JWT token
      .send(duplicateDetails);

    //Assertions
    expect(response.status).toBe(400); //HTTP status for bad request
    expect(response.body.success).toBe(false);
    expect(response.body).toHaveProperty(
      "error",
      "Duplicate field value entered"
    );
  });

  //POST Request to update password
  it("should successfully update the password after entering both the old password and new password", async () => {
    const passwordData = {
      currentPassword: registeredUser.password,
      newPassword: process.env.REGISTERED_USER_PASSWORD,
    };
    const response = await supertest(server)
      .put("/api/v1/auth/updatepassword")
      .set("Authorization", `Bearer ${token}`) //Attach JWT token
      .send(passwordData);

    //Assertions
    expect(response.status).toBe(200); //HTTP status for success
    expect(response.body.success).toBe(true);
    expect(response.body).toHaveProperty("token"); //Ensure a new token is returned
  });

  //POST Request to update password (in case of error: wrong old password)
  it("should return a 401 error when the old password is incorrect", async () => {
    const passwordData = {
      currentPassword: "password", //Wrong password entered here
      newPassword: "updatedpassword",
    };
    const response = await supertest(server)
      .put("/api/v1/auth/updatepassword")
      .set("Authorization", `Bearer ${token}`) //Attach JWT token
      .send(passwordData);

    //Assertions
    expect(response.status).toBe(401); //HTTP status for unauthorized access
    expect(response.body.success).toBe(false);
    expect(response.body).toHaveProperty("error", "Password is incorrect");
  });
});
