const request = require("supertest");
const app = require("../app");
const mongoose = require("mongoose");
const Blog = require("../models/Blog");
const User = require("../models/User");

let token;
let userId;
let blogId;
let blogTitle;

describe("Blog Routes", () => {
  // Signup new user in test DB 
  beforeAll(async () => {
    // Disconnect any existing connection 
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    try {
      await mongoose.connect(
        process.env.MONGO_DB_CONNECTION_URL_TEST ||
          "mongodb://localhost:27017/blogging_api_blogs_test"
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error("Failed to connect to MongoDB:", error.message);
      throw error;
    }

    const signupRes = await request(app).post("/auth/signup").send({
      first_name: "Test",
      last_name: "User",
      email: "blogtest@example.com",
      password: "123456",
    });

    expect(signupRes.statusCode).toBe(201);
    token = signupRes.body.token;
    userId = signupRes.body.user._id;
  }, 30000);

  //  Close DB
  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  test("Create a new blog (draft by default)", async () => {
    const res = await request(app)
      .post("/blogs")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: `My Test Blog ${Date.now()}`,
        description: "A simple blog test",
        body: "This is the blog content for testing reading time.",
        tags: ["testing", "jest"],
      });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("title");
    expect(res.body.title).toContain("My Test Blog");
    expect(res.body.state).toBe("draft");
    expect(res.body.reading_time).toBeGreaterThan(0); 
    expect(res.body.author).toBe(userId);

    blogId = res.body._id;
    blogTitle = res.body.title;
  });

  //  Publish the blog
  test("Publish a draft blog", async () => {
    const res = await request(app)
      .patch(`/blogs/${blogId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ state: "published" });

    expect(res.statusCode).toBe(200);
    expect(res.body.state).toBe("published");
  });

  // Public can get all published blogs
  test("Public should see published blogs", async () => {
    const res = await request(app).get("/blogs");
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.blogs)).toBe(true);
    expect(res.body.blogs.some((blog) => blog.title === blogTitle)).toBe(true);
  });

  // Get single blog by ID (read count increases)
  test("Get a single blog by ID and increase read_count", async () => {
    await request(app)
      .patch(`/blogs/${blogId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ state: "published" });

    const firstFetch = await request(app).get(`/blogs/${blogId}`);
    const secondFetch = await request(app).get(`/blogs/${blogId}`);

    expect(firstFetch.statusCode).toBe(200);
    expect(secondFetch.body.read_count).toBe(firstFetch.body.read_count + 1);
  });

  //  Logged-in user can view their own blogs (draft or published)
  test("Logged-in user can get their blogs", async () => {
    const res = await request(app)
      .get("/blogs/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.blogs)).toBe(true);
    expect(res.body.blogs.some((blog) => blog._id === blogId)).toBe(true);
  });

  //  Update a blog’s title or body
  test("Update a blog’s title", async () => {
    const res = await request(app)
      .put(`/blogs/${blogId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "My Updated Blog" });

    expect(res.statusCode).toBe(200);
    expect(res.body.title).toBe("My Updated Blog");
  });

  //  Pagination and filtering
  test("Paginate published blogs (limit=1)", async () => {
    const res = await request(app).get("/blogs?limit=1&page=1");
    expect(res.statusCode).toBe(200);
    expect(res.body.blogs.length).toBeLessThanOrEqual(1);
    expect(res.body.totalPages).toBeDefined();
  });

  test("Filter blogs by tag", async () => {
    const res = await request(app).get("/blogs?tags=testing");
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.blogs)).toBe(true);
  });

  // Delete the blog
  test("Delete a blog", async () => {
    const res = await request(app)
      .delete(`/blogs/${blogId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("message", "Blog deleted successfully");
  });
});
