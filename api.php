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
    $after_id = isset($_GET['after_id']) ? (int)$_GET['after_id'] : 0;
    $title_search = isset($_GET['title']) ? trim($_GET['title']) : '';
    $ingredients_search = isset($_GET['ingredients']) ? trim($_GET['ingredients']) : '';
    $shopping_list_search = isset($_GET['shopping_list']) ? trim($_GET['shopping_list']) : '';

    $output = null;

    if ($id > 0) {
        // Fetch a single recipe by ID
        $sql = "SELECT * FROM recipes WHERE id = ?";
        $stmt = $conn->prepare($sql);
        if ($stmt === false) send_json_error("SQL prepare failed: " . $conn->error);
        $stmt->bind_param("i", $id);
    } else {
        // Build a dynamic search query with keyset pagination
        $baseSql = "SELECT id, title, ingredients, ner, site FROM recipes";
        $conditions = [];
        $params = [];
        $types = '';

        if (!empty($title_search)) {
            $conditions[] = "title LIKE ?";
            $params[] = "%" . $title_search . "%";
            $types .= 's';
        }
        if (!empty($ingredients_search)) {
            $ingredients = array_filter(array_map('trim', explode(',', $ingredients_search)));
            foreach ($ingredients as $ingredient) {
                $conditions[] = "ingredients LIKE ?";
                $params[] = "%" . $ingredient . "%";
                $types .= 's';
            }
        }
        if (!empty($shopping_list_search)) {
            $shopping_items = array_filter(array_map('trim', explode(',', $shopping_list_search)));
            foreach ($shopping_items as $item) {
                $conditions[] = "ner LIKE ?";
                $params[] = "%" . $item . "%";
                $types .= 's';
            }
        }

        // Keyset pagination condition
        if ($after_id > 0) {
            $conditions[] = "id > ?";
            $params[] = $after_id;
            $types .= 'i';
        }

        $sql = $baseSql;
        if (!empty($conditions)) {
            $sql .= " WHERE " . implode(" AND ", $conditions);
        }

        // All search/browse queries are ordered by ID for pagination
        $sql .= " ORDER BY id ASC LIMIT 50";

        $stmt = $conn->prepare($sql);
        if ($stmt === false) send_json_error("SQL prepare failed: " . $conn->error);

        if (!empty($params)) {
            $stmt->bind_param($types, ...$params);
        }
    }

    // Only execute and fetch if a statement was prepared
    if ($stmt) {
        if (!$stmt->execute()) send_json_error("SQL execute failed: ". $stmt->error);

        $result = $stmt->get_result();
        if ($result === false) send_json_error("SQL get_result failed: " . $stmt->error);

        if ($id > 0) {
            $recipe = $result->fetch_assoc();
            if ($recipe) {
                $output = $recipe;
            }
        } else {
            // Overwrite output only if it wasn't set to an empty array before
            if ($output === null) {
                $output = [];
                while($row = $result->fetch_assoc()) {
                    $output[] = $row;
                }
            }
        }
        $stmt->close();
    }
    $conn->close();

    $json_output = json_encode($output);
    if (json_last_error() !== JSON_ERROR_NONE) {
        send_json_error("JSON encoding failed: " . json_last_error_msg());
    }

    echo $json_output;

} catch (Throwable $e) {
    error_log($e);
    send_json_error("An unexpected error occurred.");
}
?>
