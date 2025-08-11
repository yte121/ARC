import path from "path"

export default {
  resolve: {
    alias: {
      "@": path.resolve("./src"),
    },
  },
  server: {
    port: 3000,
    host: true
  }
}
