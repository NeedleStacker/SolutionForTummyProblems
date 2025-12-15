<?php
    // --- Dynamic Background Image Logic ---
    $bg_dir = 'assets/bg/';
    // Get all .webp files from the directory
    $bg_files = glob($bg_dir . '*.webp');
    // Select a random image from the array
    $random_bg = $bg_files[array_rand($bg_files)];
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <style>
        body {
            background-image: url('<?php echo $random_bg; ?>');
        }
    </style>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recipe Search</title>
    <link rel="icon" href="assets/favicon.png" type="image/png">
    <!-- Bootstrap CSS -->
    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <!-- Loading Indicator -->
    <div id="loader" class="loader-overlay" style="display: none;">
        <div class="loader-spinner"></div>
    </div>

    <div class="container-fluid"> <!-- Changed to fluid container -->
        <!-- Search Section -->
        <div id="search-section">
            <div class="search-container">
                <div class="row">
                    <div class="col-12">
                        <div class="receipe-headline my-5 text-center">
                            <a href="index.php" class="title-link">
                                <h2>
                                    <span class="icon-search-left"></span>
                                    Recipe Search
                                    <span class="icon-search-right"></span>
                                </h2>
                            </a>
                        </div>
                    </div>
                </div>
                <div class="search-bar">
                    <div class="row justify-content-center">
                        <div class="col-lg-8 col-md-12">
                            <div class="form-group">
                                <label for="search-input-title">By Title</label>
                                <div class="input-group">
                                    <input type="text" id="search-input-title" class="form-control" placeholder="e.g., Tofu-Garlic Mashed Potatoes">
                                    <span class="clear-btn" style="display: none;">&times;</span>
                                    <div class="input-group-append">
                                        <button class="btn btn-primary" type="button" id="search-button-title">Search</button>
                                    </div>
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="search-input-ingredients">By Ingredients</label>
                                <div class="input-group">
                                    <input type="text" id="search-input-ingredients" class="form-control" placeholder="e.g., garlic, vegetable broth, potatoes">
                                    <span class="clear-btn" style="display: none;">&times;</span>
                                    <div class="input-group-append">
                                        <button class="btn btn-primary" type="button" id="search-button-ingredients">Search</button>
                                    </div>
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="search-input-shopping">By Shopping List</label>
                                <div class="input-group">
                                    <input type="text" id="search-input-shopping" class="form-control" placeholder="e.g., salt, pepper, olive oil">
                                    <span class="clear-btn" style="display: none;">&times;</span>
                                    <div class="input-group-append">
                                        <button class="btn btn-primary" type="button" id="search-button-shopping">Search</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Results Section -->
        <div id="results-section" class="row">
            <!-- Search results will be injected here by JavaScript -->
        </div>

        <!-- Details Section (hidden by default) -->
        <div id="recipe-details-section" class="mt-5" style="display: none;">
             <!-- Recipe details will be injected here by JavaScript -->
        </div>

    </div>

    <!-- Tooltip Box -->
    <div id="unit-tooltip-box" style="position:absolute; display:none;"></div>

    <!-- Floating Action Button -->
    <a href="assets/measurements-conversions_infographic.jpg" target="_blank" class="floating-btn" title="View Measurement Conversions">
        <img src="assets/liquids.png" alt="Conversions">
    </a>

    <script src="script.js"></script>

    <footer class="footer">
        <div class="container text-center">
            <span>Copyright &copy; <?php echo date("Y") ?> Izrada: Darko Majetić</span>
        </div>
    </footer>
</body>
</html>
