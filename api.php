<?php
header("Content-Type: application/json; charset=UTF-8");

// Function to send a JSON error response and exit
function send_json_error($message) {
    http_response_code(500); // Internal Server Error
    echo json_encode(["error" => $message]);
    exit;
}

// Enable error reporting to catch issues
ini_set('display_errors', 0);
error_reporting(E_ALL);
set_error_handler(function($severity, $message, $file, $line) {
    throw new ErrorException($message, 0, $severity, $file, $line);
});

try {
    $servername = "localhost";
    $username = "liveinsb_recipes";
    $password = "your_password"; // TODO: User needs to replace this
    $dbname = "liveinsb_recipes";

    // Create connection
    $conn = new mysqli($servername, $username, $password, $dbname);

    // Check connection
    if ($conn->connect_error) {
        send_json_error("Connection failed: " . $conn->connect_error);
    }

    $conn->set_charset("utf8mb4");

    $search = isset($_GET['search']) ? $_GET['search'] : '';
    $site = isset($_GET['site']) ? $_GET['site'] : '';
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

    $sql = "";
    $types = '';
    $params = [];

    if ($id > 0) {
        $sql = "SELECT * FROM recipes WHERE id = ?";
        $types = "i";
        $params[] = $id;
    } else {
        $baseSql = "SELECT * FROM recipes";
        $conditions = [];

        if (!empty($search)) {
            $conditions[] = "(title LIKE ? OR ingredients LIKE ? OR ner LIKE ?)";
            $searchTerm = "%" . $search . "%";
            $params = array_merge($params, [$searchTerm, $searchTerm, $searchTerm]);
            $types .= 'sss';
        }

        if (!empty($site)) {
            $conditions[] = "site = ?";
            $params[] = $site;
            $types .= 's';
        }

        if (count($conditions) > 0) {
            $sql = $baseSql . " WHERE " . implode(" AND ", $conditions);
        } else {
            $sql = $baseSql;
        }

        $sql .= " LIMIT 100";
    }

    $stmt = $conn->prepare($sql);
    if ($stmt === false) {
        send_json_error("SQL prepare failed: " . $conn->error);
    }

    if (!empty($types)) {
        $stmt->bind_param($types, ...$params);
    }

    if (!$stmt->execute()) {
        send_json_error("SQL execute failed: " . $stmt->error);
    }

    $result = $stmt->get_result();
    if ($result === false) {
        send_json_error("SQL get_result failed: " . $stmt->error);
    }

    $recipes = [];
    while($row = $result->fetch_assoc()) {
        // Check for invalid UTF-8 characters in each field before encoding
        foreach ($row as $key => $value) {
            if (!mb_check_encoding($value, 'UTF-8')) {
                // You can either skip the row or try to clean it
                // For now, we will skip the problematic row and log it
                error_log("Skipping row with ID {$row['id']} due to invalid UTF-8 encoding in column '{$key}'.");
                continue 2; // Continues the outer while loop
            }
        }
        $recipes[] = $row;
    }

    $stmt->close();
    $conn->close();

    $output = null;
    if ($id > 0) {
        $output = $recipes[0] ?? null;
    } else {
        $output = $recipes;
    }

    // Final check before sending the response
    $json_output = json_encode($output);
    if (json_last_error() !== JSON_ERROR_NONE) {
        send_json_error("JSON encoding failed: " . json_last_error_msg());
    }

    echo $json_output;

} catch (Throwable $e) {
    // Catch any other errors (including connection, syntax, etc.)
    send_json_error("An unexpected error occurred: " . $e->getMessage());
}
?>
