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
  await mongoose.connection.close();
});

describe("GET Request for Reviews API", () => {
  let validReviewId; //To store a valid review ID for the tests

  //GET Request to fetch all reviews
  it("should fetch all reviews from the database", async () => {
    const response = await supertest(server).get("/api/v1/reviews");

    if (response.body.data.length > 0) {
      validReviewId = response.body.data[0]._id; //Use the first review's ID
    }

    //Assertions
    expect(response.status).toBe(200); //HTTP status for a successful request
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    response.body.data.forEach((review) => {
      expect(review).toHaveProperty("_id");
      expect(review).toHaveProperty("title");
      expect(review).toHaveProperty("rating");
      expect(review).toHaveProperty("bootcamp");
    });
  });

  //GET Request for a single review by ID
  it("should fetch a single review by ID", async () => {
    const response = await supertest(server).get(
      `/api/v1/reviews/${validReviewId}`
    );

    //Assertions
    expect(response.status).toBe(200); //HTTP status for a successful request
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty("_id", validReviewId);
    expect(response.body.data).toHaveProperty("bootcamp");
    expect(response.body.data).toHaveProperty("user");
  });

  //GET Request for a single review by ID (in case of error: wrong ID)
  it("should return a 404 error for a wrong review ID", async () => {
    const wrongId = "12345"; //Wrong ID
    const response = await supertest(server).get(`/api/v1/reviews/${wrongId}`);

    //Assertions
    expect(response.status).toBe(404); //HTTP status for resource not found
    expect(response.body.success).toBe(false);
    expect(response.body).toHaveProperty("error", "Resource not found");
  });

  //GET Request for a single review by ID (in case of error: correctly formatted, non-existent review ID)
  it("should return a 404 error for a non-existent review ID", async () => {
    const nonExistentId = new mongoose.Types.ObjectId(); //Generate a random MongoDB ObjectId
    const response = await supertest(server).get(
      `/api/v1/reviews/${nonExistentId}`
    );

    //Assertions
    expect(response.status).toBe(404); //HTTP status for resource not found
    expect(response.body.success).toBe(false);
    expect(response.body).toHaveProperty(
      "error",
      `No review found with the id of ${nonExistentId}`
    );
  });

  //GET Request to fetch all reviews associated with a bootcamp by bootcampId
  it("should fetch all reviews for a given bootcampID", async () => {
    const validBootcampId = "5d725a1b7b292f5f8ceff788"; //Existing bootcampId
    const response = await supertest(server).get(
      `/api/v1/bootcamps/${validBootcampId}/reviews`
    );

    //Assertions
    expect(response.status).toBe(200); //HTTP status for successful request
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    response.body.data.forEach((review) => {
      expect(review).toHaveProperty("_id");
      expect(review).toHaveProperty("title");
      expect(review).toHaveProperty("rating");
      expect(review).toHaveProperty("bootcamp", validBootcampId);
    });
  });

  //GET Request to fetch all reviews associated with a bootcamp by bootcampId
  //(in case of error: wrong bootcampId)
  it("should return a 404 error for a wrong bootcampId", async () => {
    const wrongId = "12345"; //Invalid MongoDB ObjectId
    const response = await supertest(server).get(
      `/api/v1/bootcamps/${wrongId}/reviews`
    );

    //Assertions
    expect(response.status).toBe(404); //HTTP status for resource not found
    expect(response.body.success).toBe(false);
    expect(response.body).toHaveProperty("error", "Resource not found");
  });

  //GET Request to fetch all reviews associated with a bootcamp by bootcampId
  //(in case of error: correctly formatted, non-existent bootcampId)
  it("should return an empty array for a non-existent bootcamp ID", async () => {
    const nonExistentId = new mongoose.Types.ObjectId(); // Valid but non-existent ID
    const response = await supertest(server).get(
      `/api/v1/bootcamps/${nonExistentId}/reviews`
    );

    //Assertions
    expect(response.status).toBe(200); //HTTP status for successful request
    expect(response.body.success).toBe(true);
    expect(response.body.count).toBe(0); //No reviews should be found
    expect(response.body.data).toEqual([]); //Data should be an empty array
  });
});

describe("POST, PUT and DELETE Requests for Reviews API", () => {
  const validBootcampId = "5d725a1b7b292f5f8ceff788"; //Existing bootcampId
  let token;
  let reviewId; //Store review ID to be used in tests
  let secondUserToken;

  beforeAll(async () => {
    //Create a user and get a token
    const userData = {
      name: "Test User",
      email: process.env.USER_EMAIL,
      password: process.env.USER_PASSWORD,
      role: "user", //Only users can add reviews
    };

    const response = await supertest(server)
      .post("/api/v1/auth/register")
      .send(userData);

    //Login the user to get a token
    const loginResponse = await supertest(server)
      .post("/api/v1/auth/login")
      .send({ email: userData.email, password: userData.password });

    //Storing the token for further requests
    token = loginResponse.body.token;
  });

  //Clean up the database connection and remove test users after all tests
  afterAll(async () => {
    console.log("MongoDB connection closing...");
    await User.deleteMany({
      email: { $in: ["testuser@example.com", "seconduser@example.com"] },
    });
    console.log("Test users cleaned up");
    await mongoose.connection.close();
  });

  //POST Request to add a review for a bootcamp (in case of error: wrong bootcampId)
  it("should return a 404 error for a wrong bootcamp ID", async () => {
    const wrongId = "12345"; // Invalid MongoDB ObjectId

    const reviewData = {
      title: "Great job",
      text: "I learned a lot",
      rating: 6,
    };
    const response = await supertest(server)
      .post(`/api/v1/bootcamps/${wrongId}/reviews`)
      .set("Authorization", `Bearer ${token}`) //Attach JWT token
      .send(reviewData);

    //Assertions
    expect(response.status).toBe(404); //HTTP status for resource not found
    expect(response.body.success).toBe(false);
    expect(response.body).toHaveProperty("error", "Resource not found");
  });

  //POST Request to add a review for a bootcamp (in case of error: valid, non-existent bootcamp ID)
  it("should return a 404 error for a non-existent bootcamp ID", async () => {
    const nonExistentBootcampId = new mongoose.Types.ObjectId(); // Valid but non-existent ID
    const reviewData = {
      title: "Great job",
      text: "I learned a lot",
      rating: 6,
    };
    const response = await supertest(server)
      .post(`/api/v1/bootcamps/${nonExistentBootcampId}/reviews`)
      .set("Authorization", `Bearer ${token}`) //Attach JWT token
      .send(reviewData);

    //Assertions
    expect(response.status).toBe(404); //HTTP status for resource not found
    expect(response.body.success).toBe(false);
    expect(response.body).toHaveProperty(
      "error",
      `No bootcamp with the id of ${nonExistentBootcampId}`
    );
  });

  //POST Request to add a review for a bootcamp
  it("should successfully add a review for a botcamp", async () => {
    const reviewData = {
      title: "Great job",
      text: "I learned a lot",
      rating: 6,
    };
    const response = await supertest(server)
      .post(`/api/v1/bootcamps/${validBootcampId}/reviews`)
      .set("Authorization", `Bearer ${token}`) //Attach JWT token
      .send(reviewData);

    reviewId = response.body.data._id;

    //Assertions
    expect(response.status).toBe(201); //HTTP status for resource creation
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty("_id");
    expect(response.body.data).toHaveProperty("title", reviewData.title);
    expect(response.body.data).toHaveProperty("bootcamp", validBootcampId);
  });

  //POST Request to add a review for a bootcamp (in case of error: Duplicate review)
  //Only 1 review per user is allowed for a specific bootcamp
  it("should return a 400 error when adding a duplicate review", async () => {
    const reviewData = {
      title: "Well done",
      text: "Excellent course",
      rating: 8,
    };

    //Duplicate review submission
    const response = await supertest(server)
      .post(`/api/v1/bootcamps/${validBootcampId}/reviews`)
      .set("Authorization", `Bearer ${token}`) //Attach JWT token
      .send(reviewData);

    //Assertions
    expect(response.status).toBe(400); //HTTP status for bad request
    expect(response.body.success).toBe(false);
    expect(response.body).toHaveProperty(
      "error",
      "Duplicate field value entered"
    );
  });

  //PUT Request to update a review (in case of error: Unauthorized access)
  it("should return a 401 error when another user tries to update the review", async () => {
    //Creating a second User
    const secondUser = {
      name: "Second User",
      email: process.env.SECOND_USER_EMAIL,
      password: process.env.SECOND_USER_PASSWORD,
      role: "user",
    };
    await supertest(server).post("/api/v1/auth/register").send(secondUser);
    const secondUserLogin = await supertest(server)
      .post("/api/v1/auth/login")
      .send({ email: secondUser.email, password: secondUser.password });

    //Storing the token of the secondUser
    secondUserToken = secondUserLogin.body.token;

    const updateData = {
      title: "Unauthorized Update",
    };
    const response = await supertest(server)
      .put(`/api/v1/reviews/${reviewId}`)
      .set("Authorization", `Bearer ${secondUserToken}`)
      .send(updateData);

    //Assertions
    expect(response.status).toBe(401); //HTTP status code for unauthorized request
    expect(response.body.success).toBe(false);
    expect(response.body).toHaveProperty(
      "error",
      "Not authorized to access this route"
    );
  });

  //PUT Request to update a review (in case of error: Wrong Id)
  it("should return a 404 error for an invalid review ID", async () => {
    const invalidId = new mongoose.Types.ObjectId(); //Generate a random ID
    const updateData = { title: "Invalid Update" };
    const response = await supertest(server)
      .put(`/api/v1/reviews/${invalidId}`)
      .set("Authorization", `Bearer ${token}`) // Attach JWT token
      .send(updateData);

    //Assertions
    expect(response.status).toBe(404); //Not found
    expect(response.body.success).toBe(false);
    expect(response.body).toHaveProperty(
      "error",
      `No review with the id of ${invalidId}`
    );
  });

  //PUT Request to update a review successfully
  it("should successfully update a review", async () => {
    const updateData = {
      title: "Had Fun",
    };
    const response = await supertest(server)
      .put(`/api/v1/reviews/${reviewId}`)
      .set("Authorization", `Bearer ${token}`) //Attach JWt token
      .send(updateData);

    //Assertions
    expect(response.status).toBe(200); //HTTP status for success
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty("title", "Had Fun");
  });

  //DELETE Request to delete a review (in case of error: invalid review ID)
  it("should return a 404 error for an invalid review ID", async () => {
    const invalidId = new mongoose.Types.ObjectId(); //Creating a MongoDB ID
    const response = await supertest(server)
      .delete(`/api/v1/reviews/${invalidId}`)
      .set("Authorization", `Bearer ${token}`); //Attach JWT token

    //Assertions
    expect(response.status).toBe(404); //Not found
    expect(response.body.success).toBe(false);
    expect(response.body).toHaveProperty(
      "error",
      `No review with the id of ${invalidId}`
    );
  });

  //DELETE Request to delete a review (in case of error: Unauthorized Access - Another user)
  it("should return a 401 error when another user tries to delete the review", async () => {
    const response = await supertest(server)
      .delete(`/api/v1/reviews/${reviewId}`)
      .set("Authorization", `Bearer ${secondUserToken}`); //Attach JWT token

    //Assertions
    expect(response.status).toBe(401); //Unauthorized
    expect(response.body.success).toBe(false);
    expect(response.body).toHaveProperty(
      "error",
      "Not authorized to access this route"
    );
  });

  //DELETE Request to successfully delete a review
  it("should successfully delete a review", async () => {
    const response = await supertest(server)
      .delete(`/api/v1/reviews/${reviewId}`)
      .set("Authorization", `Bearer ${token}`); //Attach JWT token

    //Assertions
    expect(response.status).toBe(200); //HTTP status for success
    expect(response.body.success).toBe(true);
  });
});
