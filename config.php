<?php
// Enable full error reporting and log to a file
error_reporting(E_ALL);
ini_set('display_errors', 0); // Disable displaying errors to the user
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/php_error.log'); // Log errors in the same folder

// Set headers for JSON content type and UTF-8 charset
header("Content-Type: application/json; charset=utf-8");

// Set the default timezone
date_default_timezone_set('Europe/Zagreb');

// MySQL configuration - TODO: User needs to replace these credentials
$db_host = "localhost";
$db_user = "liveinsb_recipes"; // Placeholder
$db_pass = "your_password";    // Placeholder
$db_name = "liveinsb_recipes"; // Placeholder

// Establish database connection
$conn = new mysqli($db_host, $db_user, $db_pass, $db_name);

// Check for connection errors
if ($conn->connect_error) {
    // We use die() here because if the DB connection fails, the API can't do anything.
    // The JSON output ensures that if the frontend receives this, it won't be a parsing error.
    die(json_encode(array("error" => "DB connection failed: " . $conn->connect_error)));
}

// Set the character set to UTF-8 for the connection
mysqli_set_charset($conn, "utf8");
