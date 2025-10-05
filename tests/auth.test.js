const request = require("supertest");
const app = require("../app");
const mongoose = require("mongoose");
const User = require("../models/User");

describe("🧑‍💻 Auth Routes", () => {
  let token;

  // Connect to test DB before tests
  beforeAll(async () => {
    // Disconnect any existing connection first
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    try {
      await mongoose.connect(
        process.env.MONGO_DB_CONNECTION_URL_TEST ||
          "mongodb://localhost:27017/blogging_api_auth_test"
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error("Failed to connect to MongoDB:", error.message);
      throw error;
    }
  }, 30000);

  // Close DB after tests
  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  test("Signup a new user", async () => {
    const res = await request(app).post("/auth/signup").send({
      first_name: "princess",
      last_name: "dada",
      email: "princess@example.com",
      password: "123456",
    });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("token");
    token = res.body.token;
  });

  test("Login with the same user", async () => {
    const res = await request(app).post("/auth/login").send({
      email: "princess@example.com",
      password: "123456",
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("token");
  });
});
