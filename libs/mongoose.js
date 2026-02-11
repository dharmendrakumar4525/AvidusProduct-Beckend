/**
 * MongoDB Connection Module
 * Handles MongoDB connection and connection event listeners
 */

"use strict";
const mongoose = require("mongoose");
const env = require("../config/env");

/**
 * Connect to MongoDB Database
 * Establishes connection to MongoDB using configuration from environment
 * Sets up event listeners for connection events
 */
module.exports.connect = () => {
    const dbName = env.db.name;
    const url = `${env.db.url}`;
    
    // Enable MongoDB query debugging (uncomment if needed)
    // mongoose.set("debug", env.debug_mongo);

    /**
     * Connect to MongoDB
     * Uses new URL parser and unified topology for better connection handling
     */
    mongoose.connect(url, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });

    /**
     * Connection Event: Connected
     * Fired when MongoDB connection is successfully established
     */
    mongoose.connection.on("connected", (err, result) => {
        console.log(`Successfully connected to DB: ${dbName}`);
    });

    /**
     * Connection Event: Error
     * Fired when MongoDB connection encounters an error
     */
    mongoose.connection.on("error", err => {
        console.log(`Failed to connect to DB: ${dbName}, ${err}`);
    });

    /**
     * Connection Event: Disconnected
     * Fired when MongoDB connection is lost or closed
     */
    mongoose.connection.on("disconnected", err => {
        console.log(`Default connection to DB: ${dbName} disconnected`);
    });
};


