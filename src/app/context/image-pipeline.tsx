/**
 * React context for the ImageTransformPipeline.
 *
 * Wrap your app in <ImagePipelineProvider pipeline={...}> to make
 * the pipeline available to all glass-atlas components via useImagePipeline().
 *
 * Default: PassthroughPipeline (URLs returned unchanged).
 */

import { createContext, useContext, type ReactNode } from "react";
import type { ImageTransformPipeline } from "../pipelines/types";
import { passthroughPipeline } from "../pipelines/passthrough";

const ImagePipelineContext = createContext<ImageTransformPipeline>(passthroughPipeline);

interface ImagePipelineProviderProps {
  pipeline: ImageTransformPipeline;
  children: ReactNode;
}

export function ImagePipelineProvider({ pipeline, children }: ImagePipelineProviderProps) {
  return (
    <ImagePipelineContext.Provider value={pipeline}>
      {children}
    </ImagePipelineContext.Provider>
  );
}

/**
 * Access the current image transform pipeline from any component.
 *
 * @example
 * const pipeline = useImagePipeline();
 * const src = pipeline.transform(rawUrl, "grid");
 */
export function useImagePipeline(): ImageTransformPipeline {
  return useContext(ImagePipelineContext);
}
