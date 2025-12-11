<?php
header("Content-Type: application/json; charset=UTF-8");

$servername = "localhost";
$username = "liveinsb_recipes";
$password = "your_password"; // TODO: User needs to replace this
$dbname = "liveinsb_recipes";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    die(json_encode(["error" => "Connection failed: " . $conn->connect_error]));
}

// Set character set to utf8mb4
$conn->set_charset("utf8mb4");

$search = isset($_GET['search']) ? $_GET['search'] : '';
$site = isset($_GET['site']) ? $_GET['site'] : '';
$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if ($id > 0) {
    $sql = "SELECT * FROM recipes WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $id);
} else {
    $sql = "SELECT * FROM recipes";
    $conditions = [];
    $params = [];
    $types = '';

    if (!empty($search)) {
        $conditions[] = "(title LIKE ? OR ingredients LIKE ? OR ner LIKE ?)";
        $searchTerm = "%" . $search . "%";
        array_push($params, $searchTerm, $searchTerm, $searchTerm);
        $types .= 'sss';
    }

    if (!empty($site)) {
        $conditions[] = "site = ?";
        array_push($params, $site);
        $types .= 's';
    }

    if (count($conditions) > 0) {
        $sql .= " WHERE " . implode(" AND ", $conditions);
    }

    $sql .= " LIMIT 100"; // Limit results for performance

    $stmt = $conn->prepare($sql);
    if (!empty($types)) {
        $stmt->bind_param($types, ...$params);
    }
}


$stmt->execute();
$result = $stmt->get_result();

$recipes = [];
if ($result->num_rows > 0) {
    while($row = $result->fetch_assoc()) {
        $recipes[] = $row;
    }
} else if ($id > 0) {
    // Return a single object instead of an array if fetching by id
    $recipes = null;
}


$stmt->close();
$conn->close();

if ($id > 0) {
    echo json_encode($recipes[0]);
} else {
    echo json_encode($recipes);
}
?>
