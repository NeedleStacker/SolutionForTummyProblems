<?php
// Include the configuration and database connection setup
require_once 'config.php';

// Function to send a JSON error response and exit
function send_json_error($message) {
    http_response_code(500); // Internal Server Error
    echo json_encode(["error" => $message]);
    exit;
}

// Set a global error handler that uses our JSON error function
set_error_handler(function($severity, $message, $file, $line) {
    throw new ErrorException($message, 0, $severity, $file, $line);
});

try {
    // Sanitize inputs
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
        $baseSql = "SELECT id, title, ingredients, ner, site FROM recipes"; // Select only needed columns
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

    $json_output = json_encode($output);
    if (json_last_error() !== JSON_ERROR_NONE) {
        send_json_error("JSON encoding failed: " . json_last_error_msg());
    }

    echo $json_output;

} catch (Throwable $e) {
    // Catch any other errors and send a generic message
    error_log($e); // Log the actual error
    send_json_error("An unexpected error occurred.");
}
?>
