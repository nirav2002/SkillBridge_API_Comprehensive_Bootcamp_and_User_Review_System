const supertest = require("supertest");
const app = require("../server");
const mongoose = require("mongoose");

let server;

beforeAll(() => {
  server = app.listen(5000);
});

afterAll(async () => {
  console.log("Closing the database and the server now...");
  await mongoose.connection.close();
  await server.close();
});

describe("Rate Limiting Feature", () => {
  it("should allow only 10 requests per minute and block the 11th request", async () => {
    //Send 10 successful requests
    for (let i = 0; i < 10; i++) {
      const response = await supertest(server).get("/api/v1/bootcamps");
      expect(response.status).toBe(200); //Assuming successfull responses are status 200
    }

    //Send the 11th request
    const blockedResponse = await supertest(server).get("/api/v1/bootcamps");
    expect(blockedResponse.status).toBe(429); //Status 429 for "Too Many Requests"

    //The text is a string, not an object
    //Match dynamic message format
    expect(blockedResponse.text).toMatch(
      /Too many requests, please try again after \d+ seconds\./
    );
  });
});
