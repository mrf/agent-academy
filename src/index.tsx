import React from "react";
import { render, Text, Box } from "ink";

function App() {
  return (
    <Box flexDirection="column" padding={1}>
      <Text color="#00D4FF" bold>
        ╔══════════════════════════════════════╗
      </Text>
      <Text color="#00D4FF" bold>
        ║   CLAUDE CODE ACADEMY — TTD v0.1    ║
      </Text>
      <Text color="#00D4FF" bold>
        ╚══════════════════════════════════════╝
      </Text>
      <Text color="#6B6B6B">
        Terminal Training Division — Standing by...
      </Text>
    </Box>
  );
}

render(<App />);
