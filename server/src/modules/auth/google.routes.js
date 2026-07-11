const express = require("express");
const router = express.Router();
const googleController = require("./google.controller");

// GET so it can be hit by a plain browser redirect (e.g. <a href> or window.location)
router.get("/", googleController.redirectToGoogle);

// GET because this is where Google itself redirects the browser back to
router.get("/callback", googleController.handleCallback);

// POST from the frontend, trading the one-time code for the real identityToken
router.post("/exchange", googleController.exchange);

module.exports = router;
