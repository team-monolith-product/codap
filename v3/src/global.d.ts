declare module "*.csv";
declare module "*.png";
declare module "*.svg";
declare module "d3-v6-tip";

// used by libraries like React and MST to control runtime behavior
declare namespace process {
  const env: {
    NODE_ENV: string; // e.g. "development" or "production"
  }
}
