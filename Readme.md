# Assistant

Welcome to the Assistant! This project is designed to enhance productivity and creativity by integrating cutting-edge technologies for building Assistants.

## Features

- **WhatsApp Integration**: Utilize the `whatsapp-web.js` library to create a robust chat interface, handling messages and commands efficiently.
- **AI-Powered Conversations**: Leverage OpenAI's API to power chat agents with advanced conversational capabilities, ensuring a personalized user experience.
- **Dynamic Agent Management**: Easily create, modify, and manage chat agents with the `AgentManager` class for flexible and scalable configurations.
- **Upcoming Stable Diffusion Integration**: Soon, you'll be able to generate stunning images from text prompts using the `stable-diffusion-api`.
- **Environment Configuration**: Manage your environment variables effortlessly with `dotenv`.

## Getting Started

### Prerequisites

- Node.js
- bun
- Docker (optional, for containerized deployment)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/ottobunge/Assistant.git
   cd Assistant
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Set up environment variables:
   - Copy `.env.template` to `.env` and fill in the required values.

4. Run the application:
   ```bash
   bun src/index.ts
   ```

## Usage

- **WhatsApp Integration**: Follow the console instructions to scan the QR code and connect your WhatsApp account.
- **Agent Management**: Use commands to create and manage chat agents within the application.

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request for any improvements or bug fixes.

## License

This project is licensed under the MIT License.

## Contact

For questions or collaboration, feel free to reach out to [your email] or open an issue on GitHub.

---

Thank you for checking out the Assistant! We hope it helps you build amazing chat experiences. 🚀
