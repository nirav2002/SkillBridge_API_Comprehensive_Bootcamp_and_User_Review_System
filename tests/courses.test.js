const supertest = require("supertest");
const mongoose = require("mongoose");
const app = require("../server");
const Bootcamp = require("../models/Bootcamp");
const User = require("../models/User");
const Course = require("../models/Course");

let server;
let token; //To store the JWT token
let bootcampId; //To store the created bootcamp ID
let courseId; //To store the created course ID

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

  //Clean up created bootcamp
  if (bootcampId) {
    await Bootcamp.findByIdAndDelete(bootcampId);
  }

  //Clean up created user
  await User.deleteOne({ email: process.env.PUBLISHER_EMAIL });

  await mongoose.connection.close(); //Close the MongoDB Connection
  console.log("MongoDB connection closed");
});

describe("GET Requests for Courses API", () => {
  //GET Request to fetch all the courses in the database
  it("should fetch all courses in the database", async () => {
    const response = await supertest(server).get("/api/v1/courses");

    //Assertions
    expect(response.status).toBe(200); //HTTP status for successful request
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    response.body.data.forEach((course) => {
      expect(course).toHaveProperty("_id");
      expect(course).toHaveProperty("title");
      expect(course).toHaveProperty("description");
      expect(course).toHaveProperty("weeks");
      expect(course).toHaveProperty("tuition");
      expect(course).toHaveProperty("bootcamp"); //Each course should be associated with a bootcamp
    });
  });

  //GET Request for a course by ID
  it("should fetch a single course by ID", async () => {
    const courseId = "5d725cfec4ded7bcb480eaa6"; //ID of a course in the database
    const response = await supertest(server).get(`/api/v1/courses/${courseId}`);
    //Assertions
    expect(response.status).toBe(200); //HTTP status for successful request
    expect(response.body.data).toHaveProperty("_id", courseId);
    expect(response.body.data).toHaveProperty("title");
    expect(response.body.data).toHaveProperty("description");
    expect(response.body.data).toHaveProperty("weeks");
    expect(response.body.data).toHaveProperty("tuition");
    expect(response.body.data).toHaveProperty("bootcamp");
  });

  //GET Request for a course by ID (in case of error)
  it("should return a 404 error when trying to fetch a non-existent course by ID", async () => {
    const invalidCourseId = new mongoose.Types.ObjectId(); //Generate a random ObjectId
    const response = await supertest(server).get(
      `/api/v1/courses/${invalidCourseId}`
    );

    //Assertions
    expect(response.status).toBe(404); //HTTP status for resource not found
    expect(response.body.success).toBe(false);
    expect(response.body).toHaveProperty(
      "error",
      `No course with the id of ${invalidCourseId}`
    );
  });
});

describe("POST, PUT, DELETE Requests for Courses API", () => {
  beforeAll(async () => {
    //Create a publisher user and get a token
    const publisherUser = {
      name: "Test Publisher",
      email: process.env.PUBLISHER_EMAIL,
      password: process.env.PUBLISHER_PASSWORD,
      role: "publisher", //In order to publish a bootcamp, publisher role is needed
    };

    //Registering the user
    await supertest(server).post("/api/v1/auth/register").send(publisherUser);

    const publisherUserDetails = {
      email: publisherUser.email,
      password: publisherUser.password,
    };

    //Login to get the token
    const loginResponse = await supertest(server)
      .post("/api/v1/auth/login")
      .send(publisherUserDetails);

    //Storing the token
    token = loginResponse.body.token;

    //Create a bootcamp
    const bootcampData = {
      name: "Test Bootcamp for Courses",
      description: "Bootcamp to test course creation",
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

    const bootcampResource = await supertest(server)
      .post("/api/v1/bootcamps")
      .set("Authorization", `Bearer ${token}`) //Attach JWT token
      .send(bootcampData);

    bootcampId = bootcampResource.body.data._id;
    console.log("Checking: " + bootcampId);
  });

  //POST Request for creating a course
  it("should create a course associated with the created bootcamp", async () => {
    const courseData = {
      title: "React Development",
      description: "Learn to build scalable React apps",
      weeks: "6",
      tuition: 1000,
      minimumSkill: "intermediate",
      scholarshipsAvailable: true,
    };
    const response = await supertest(server)
      .post(`/api/v1/bootcamps/${bootcampId}/courses`)
      .set("Authorization", `Bearer ${token}`) //Attach JWT token
      .send(courseData);

    courseId = response.body.data._id; //Store the created course ID

    //Assertions
    expect(response.status).toBe(201); //HTTP status for successful creation
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty("_id");
    expect(response.body.data).toHaveProperty("title", courseData.title);
    expect(response.body.data).toHaveProperty("bootcamp", bootcampId);
  });

  //POST Request for creating a course (in case of error: Missing details)
  it("should return a 400 error if required fields are missing", async () => {
    const incompleteCourseData = {
      //Missing required fields like title and description
      weeks: "6",
    };
    const response = await supertest(server)
      .post(`/api/v1/bootcamps/${bootcampId}/courses`)
      .set("Authorization", `Bearer ${token}`) //Attach JWT token
      .send(incompleteCourseData);

    //Assertions
    expect(response.status).toBe(400); //HTTP status for bad request
    expect(response.body.success).toBe(false);
    expect(response.body).toHaveProperty("error");
  });

  //POST Request for creating a course (in case of error: Invalid bootcamp ID)
  it("should return a 404 error for an invalid bootcamp ID", async () => {
    const invalidBootcampId = new mongoose.Types.ObjectId(); //Generate a random ObjectId
    const courseData = {
      title: "Node.js API Development",
      description: "Master building RESTful APIs with Node.js",
      weeks: "8",
      tuition: 1200,
      minimumSkill: "beginner",
      scholarshipsAvailable: false,
    };
    const response = await supertest(server)
      .post(`/api/v1/bootcamps/${invalidBootcampId}/courses`)
      .set("Authorization", `Bearer ${token}`) //Attach JWT token
      .send(courseData);

    //Assertions
    expect(response.status).toBe(404); //HTTP status for resource not found
    expect(response.body.success).toBe(false);
  });

  //PUT Request to Courses API in order to modify the course
  it("should update the tuition field of the created course", async () => {
    const updatedData = {
      tuition: 2000,
    };
    const response = await supertest(server)
      .put(`/api/v1/courses/${courseId}`)
      .set("Authorization", `Bearer ${token}`) //Attach JWT token
      .send(updatedData);

    //Assertions
    expect(response.status).toBe(200); //HTTP status for successful update
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty("_id", courseId);
    expect(response.body.data).toHaveProperty("tuition", 2000); //Ensure tuition is updated
  });

  //PUT Request to Courses API (in case of error: Handle an invalid course ID)
  it("should return a 404 error when updating a non-existent course", async () => {
    const invalidCourseId = new mongoose.Types.ObjectId(); //Generate a random ObjectId
    const updatedData = {
      tuition: 3000,
    };
    const response = await supertest(server)
      .put(`/api/v1/courses/${invalidCourseId}`)
      .set("Authorization", `Bearer ${token}`) //Attach JWT token
      .send(updatedData);

    //Assertions
    expect(response.status).toBe(404); //HTTP status for resource not found
    expect(response.body.success).toBe(false);
  });

  //DELETE Request to delete the created course
  it("should delete the created course successfully", async () => {
    const response = await supertest(server)
      .delete(`/api/v1/courses/${courseId}`)
      .set("Authorization", `Bearer ${token}`); //Attach JWT token

    //Assertions
    expect(response.status).toBe(200); //HTTP status for successful deletion
    expect(response.body.success).toBe(true);
  });

  //DELETE Request for Courses API (in case of error: Handle an invalid course ID)
  it("should return a 404 error when trying to delete a non-existent course", async () => {
    const invalidCourseId = new mongoose.Types.ObjectId();
    const response = await supertest(server)
      .delete(`/api/v1/courses/${invalidCourseId}`) //Generate a random ObjectId
      .set("Authorization", `Bearer ${token}`); //Attach JWT token

    //Assertions
    expect(response.status).toBe(404); //HTTP status for resource not found
    expect(response.body.success).toBe(false);
  });
});
