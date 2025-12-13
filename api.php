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
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    $title_search = isset($_GET['title']) ? trim($_GET['title']) : '';
    $ingredients_search = isset($_GET['ingredients']) ? trim($_GET['ingredients']) : '';
    $shopping_list_search = isset($_GET['shopping_list']) ? trim($_GET['shopping_list']) : '';

    $sql = "";
    $types = '';
    $params = [];

    if ($id > 0) {
        // Fetch a single recipe by ID
        $sql = "SELECT * FROM recipes WHERE id = ?";
        $types = "i";
        $params[] = $id;
    } else {
        // Build a dynamic search query
        $baseSql = "SELECT id, title, ingredients, ner, site FROM recipes";
        $conditions = [];

        // Add title condition
        if (!empty($title_search)) {
            $conditions[] = "title LIKE ?";
            $params[] = "%" . $title_search . "%";
            $types .= 's';
        }

        // Add ingredients conditions
        if (!empty($ingredients_search)) {
            $ingredients = array_filter(array_map('trim', explode(',', $ingredients_search)));
            foreach ($ingredients as $ingredient) {
                $conditions[] = "ingredients LIKE ?";
                $params[] = "%" . $ingredient . "%";
                $types .= 's';
            }
        }

        // Add shopping list (ner) conditions
        if (!empty($shopping_list_search)) {
            $shopping_items = array_filter(array_map('trim', explode(',', $shopping_list_search)));
            foreach ($shopping_items as $item) {
                $conditions[] = "ner LIKE ?";
                $params[] = "%" . $item . "%";
                $types .= 's';
            }
        }

        // Combine conditions if any exist
        if (!empty($conditions)) {
            $baseSql .= " WHERE " . implode(" AND ", $conditions);
            $baseSql .= " LIMIT 200"; // Apply a limit to search results
        } else {
            // If no search criteria, get random recipes
            $baseSql .= " ORDER BY RAND() LIMIT 200";
        }

        $sql = $baseSql;
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

    $output = ($id > 0) ? ($recipes[0] ?? null) : $recipes;

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
