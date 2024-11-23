const supertest = require("supertest");
const mongoose = require("mongoose");
const app = require("../server");
const User = require("../models/User");
const Bootcamp = require("../models/Bootcamp");

let server;

//Start the server before each test
beforeEach(() => {
  server = app.listen(5000);
});

//Stop the server after each test
afterEach(async () => {
  await server.close();
});

//Using the afterAll hooks for database cleanup

afterAll(async () => {
  console.log("MongoDB connection closing...");

  //Clean up the test user
  await User.deleteOne({ email: process.env.PUBLISHER_EMAIL });

  await mongoose.connection.close(); //Close the MongoDB Connection
});

describe("GET Request for Bootcamps API", () => {
  //Get all bootcamps
  it("should fetch all bootcamps in the database", async () => {
    const response = await supertest(server).get("/api/v1/bootcamps");

    //Assertions
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  //Get bootcamps by ID
  it("should fetch a single bootcamp by ID", async () => {
    const bootcampId = "5d725a1b7b292f5f8ceff788"; //A valid bootcamp ID
    const response = await supertest(server).get(
      `/api/v1/bootcamps/${bootcampId}`
    );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty("_id", bootcampId);
  });

  //Get bootcamps by Id (in case of error)
  it("should return 404 for a non-existent bootcamp ID", async () => {
    const nonExistentId = new mongoose.Types.ObjectId(); //Generating a random ID
    const response = await supertest(server).get(
      `/api/v1/bootcamps/${nonExistentId}`
    );

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe(
      `Bootcamp not found with id of ${nonExistentId}`
    );
  });

  //Pagination and limit with respect to bootcamps
  it("should fetch bootcamps with pagination and limit", async () => {
    const page = 1; //Page number
    const limit = 3; //Number of items per page

    const response = await supertest(server).get(
      `/api/v1/bootcamps?page=${page}&limit=${limit}`
    );

    //Assertions
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBe(3); //Ensuring only 3 items are returned, i.e. limit

    //Assertions for pagination metadata
    expect(response.body.pagination).toBeDefined(); //Ensuring pagination metadata exists
    expect(response.body.pagination.next).toBeDefined(); //Ensuring next page meta data exists
    expect(response.body.pagination.next.page).toBe(2); //Next page should be page 2
    expect(response.body.pagination.next.limit).toBe(limit); //Limit should remain the same

    //Validating the structure of the returned bootcamp objects
    response.body.data.forEach((bootcamp) => {
      expect(bootcamp).toHaveProperty("_id");
      expect(bootcamp).toHaveProperty("name");
      expect(bootcamp).toHaveProperty("description");
      expect(bootcamp).toHaveProperty("averageCost");
      expect(bootcamp).toHaveProperty("location");
    });
  });
});

describe("POST, PUT, DELETE Requests for Bootcamps API", () => {
  let token; //To store the JWT token
  let bootcampId; //Bootcamp ID created during POST request

  beforeAll(async () => {
    //Create a publisher user and get a token
    const publisherUser = {
      name: "Test Publisher",
      email: process.env.PUBLISHER_EMAIL,
      password: process.env.PUBLISHER_PASSWORD,
      role: "publisher", //In order to publish a bootcamp
    };

    //Register the user
    await supertest(server).post("/api/v1/auth/register").send(publisherUser);

    const publisherUserDetails = {
      email: publisherUser.email,
      password: publisherUser.password,
    };

    //Login to get the token
    const loginResponse = await supertest(server)
      .post("/api/v1/auth/login")
      .send(publisherUserDetails);

    token = loginResponse.body.token;
  });

  //Creating a new bootcamp (in case of error)
  it("should return a 400 error if required fields are missing", async () => {
    const incompleteBootcamp = {
      //Missing required fields like name and description
      website: "https://incompletebootcamp.com",
    };

    const response = await supertest(server)
      .post("/api/v1/bootcamps")
      .set("Authorization", `Bearer ${token}`) //Adding the JWT token
      .send(incompleteBootcamp);

    //Assertions
    expect(response.status).toBe(400); //HTTP status code for bad request
    expect(response.body.success).toBe(false);
    expect(response.body).toHaveProperty("error");
  });

  //Creating a new bootcamp
  it("should create a new bootcamp with valid data", async () => {
    const newBootcamp = {
      name: "Test Bootcamp",
      description: "A test bootcamp for integration testing",
      website: "https://testbootcamp.com",
      phone: "(555) 555-5555",
      email: "test@bootcamp.com",
      address: "123 Test Street, Test City, TX",
      careers: ["Web Development", "Data Science"],
      housing: true,
      jobAssistance: true,
      jobGuarantee: false,
      acceptGi: true,
    };

    const response = await supertest(server)
      .post("/api/v1/bootcamps")
      .set("Authorization", `Bearer ${token}`) //Attaching the JWT token
      .send(newBootcamp);

    //Assign the created bootcamp ID
    bootcampId = response.body.data._id;

    //Assertions
    expect(response.status).toBe(201); //HTTP status code for successful creation
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty("_id");
    expect(response.body.data).toHaveProperty("name", newBootcamp.name);
    expect(response.body.data).toHaveProperty(
      "description",
      newBootcamp.description
    );
    expect(response.body.data).toHaveProperty("email", newBootcamp.email);
  });

  //Creating a bootcamp through the same user (duplicate entry not allowed)
  it("should return an error when the same publisher tries to create another bootcamp", async () => {
    const anotherBootcamp = {
      name: "Another Bootcamp",
      description: "This is another bootcamp attempted by the same publisher.",
      website: "https://anotherbootcamp.com",
      phone: "(666) 666-6666",
      email: "another@bootcamp.com",
      address: "789 Another St, New City, NY",
      careers: ["UI/UX", "Mobile Development"],
      housing: false,
      jobAssistance: false,
      jobGuarantee: true,
      acceptGi: false,
    };

    const response = await supertest(server)
      .post("/api/v1/bootcamps")
      .set("Authorization", `Bearer ${token}`) //Attaching the JWT token
      .send(anotherBootcamp);

    //Assertions
    expect(response.status).toBe(400); //HTTP status code for error
    expect(response.body.success).toBe(false);
    expect(response.body).toHaveProperty(
      "error",
      expect.stringMatching(/has already published a bootcamp/i)
    );
    expect(response.body.success).toBe(false);
  });

  //PUT Request for Updating the created bootcamp
  it("should update the housing field of the created bootcamp", async () => {
    const updatedField = {
      housing: false,
    };

    const response = await supertest(server)
      .put(`/api/v1/bootcamps/${bootcampId}`)
      .set("Authorization", `Bearer ${token}`)
      .send(updatedField);

    //Assertions
    expect(response.status).toBe(200); //HTTP status for successful update
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty("housing", false); //Ensure housing is updated
  });

  it("should return a 404 error when updating a non-existent bootcamp", async () => {
    const invalidId = new mongoose.Types.ObjectId(); //Generating a random ID
    const updatedField = {
      housing: false,
    };

    const response = await supertest(server)
      .put(`/api/v1/bootcamps/${invalidId}`)
      .set("Authorization", `Bearer ${token}`)
      .send(updatedField);

    //Assertions
    expect(response.status).toBe(404); //HTTP status for resource not found
    expect(response.body.success).toBe(false);
  });

  //DELETE Request to delete the bootcamp
  it("should delete the created bootcamp successfully", async () => {
    const response = await supertest(server)
      .delete(`/api/v1/bootcamps/${bootcampId}`)
      .set("Authorization", `Bearer ${token}`); //Attaching the JWT token

    //Assertions
    expect(response.status).toBe(200); //HTTP status for successful deletion
    expect(response.body.success).toBe(true);
  });

  //DELETE Request to delete the bootcamp (in case of error)
  it("should return a 404 error when trying to delete a non-existing bootcamp", async () => {
    const invalidId = new mongoose.Types.ObjectId(); //Generate a random, non-existent Id

    const response = await supertest(server)
      .delete(`/api/v1/bootcamps/${invalidId}`)
      .set("Authorization", `Bearer ${token}`);

    //Assertions
    expect(response.status).toBe(404); //HTTP status for resource not found
    expect(response.body.success).toBe(false);
    expect(response.body).toHaveProperty("error");
  });
});
