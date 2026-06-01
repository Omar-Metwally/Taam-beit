/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MINIO_PUBLIC_URL: string;
}

declare module "*.svg?react" {
  import * as React from "react";
  const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>;
  export default ReactComponent;
}
