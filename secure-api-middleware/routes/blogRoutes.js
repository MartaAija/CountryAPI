/**
 * Blog Routes Module
 * Defines all routes related to blog posts, comments, and social interactions
 */
const express = require("express");
const router = express.Router();
const blogController = require("../controllers/blogController");
const authenticate = require("../middleware/authenticate");
const apiKeyVerifier = require("../middleware/apiKeyVerifier");

// Public routes (no authentication required)
router.get("/posts", blogController.getPosts);
router.get("/posts/:id", blogController.getPostById);

// Add route to get all users for dropdown
router.get("/users", blogController.getAllUsers);

// Add route to get user data by ID
router.get("/users/:userId", blogController.getUserById);

// Protected routes (authentication required)
router.post("/posts", authenticate, blogController.createPost);
router.put("/posts/:id", authenticate, blogController.updatePost);
router.delete("/posts/:id", authenticate, blogController.deletePost);

// Comments
router.post("/posts/:id/comments", authenticate, blogController.addComment);
router.delete("/posts/:id/comments/:commentId", authenticate, blogController.deleteComment);
router.post("/posts/:id/comments/:commentId/replies", authenticate, blogController.addReply);
router.delete("/posts/:id/comments/:commentId/replies/:replyId", authenticate, blogController.deleteReply);

// Reactions
router.post("/posts/:id/reaction", authenticate, blogController.handleReaction);

// Social
router.post("/users/:userId/follow", authenticate, blogController.followUser);
router.delete("/users/:userId/follow", authenticate, blogController.unfollowUser);
router.get("/users/:userId/connections", blogController.getUserConnections);
router.get("/feed", authenticate, blogController.getFollowingFeed);

module.exports = router;
