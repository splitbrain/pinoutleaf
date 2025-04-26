# PCB Pinout Diagram Generator

This project generates Scalable Vector Graphics (SVG) pinout diagrams for Printed Circuit Boards (PCBs) based on configuration files written in YAML or JSON. It provides both a web-based editor for interactive diagram creation and a command-line interface (CLI) for batch processing.

## Features

*   **SVG Output:** Generates clean, scalable SVG diagrams.
*   **Configuration:** Define pinouts, board dimensions, labels, and types using simple YAML or JSON files.
*   **Web Editor:**
    *   Real-time preview of the diagram as you edit the configuration.
    *   Syntax highlighting for YAML.
    *   Load configurations from local files, URLs, or browser storage.
    *   Download generated SVG diagrams (front and back views).
*   **CLI Tool:** Process multiple configuration files or entire directories to generate SVG diagrams programmatically.
*   **Image Embedding:** Embed background images (e.g., photos of the PCB) from local paths or URLs directly into the SVG. Supports front and back images.
*   **Customization:** Define custom types for pins with specific background and foreground colors, automatically generating a legend.
*   **Front & Back Views:** Automatically generates diagrams for both the front and back sides of the PCB.

## Usage

### Web Editor

1.  Open `public/index.html` in your web browser (requires a local web server or building the project).
2.  Edit the YAML configuration in the editor pane.
3.  The SVG diagram preview will update automatically.
4.  Use the "Download SVG" buttons below each preview to save the front or back view.

### Command-Line Interface (CLI)

1.  Ensure you have Node.js installed.
2.  Run the CLI tool with configuration files or directories as arguments:

    ```bash
    node src/cli.js path/to/your/config.yaml path/to/another/config.json some/directory/
    ```
3.  The tool will generate corresponding `.svg` files (e.g., `config.front.svg`, `config.back.svg`) in the same directory as the input files.

## Configuration

Diagrams are configured using YAML or JSON files. Key sections include:

*   `title`: The title displayed on the diagram.
*   `width`, `height`: Board dimensions in number of pins.
*   `pins`: Defines pin labels and types for `left`, `right`, `top`, `bottom` rows.
*   `types`: Custom pin type definitions (colors).
*   `image`: Configuration for embedding background images (front/back).

See the example files in `public/pinouts/` for detailed structure.

## Development

1.  Install dependencies:
    ```bash
    npm install
    ```
2.  Build the project (for web editor and CLI):
    ```bash
    node build.js
    ```
3.  Start the development server with hot reloading for the web editor:
    ```bash
    node build.js --serve
    ```

```
