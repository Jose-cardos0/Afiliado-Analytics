import React from "react";
import type { VideoInputProps } from "./types";
import { ShowcaseVideo } from "./templates/ShowcaseVideo";
import { FastCutsVideo } from "./templates/FastCutsVideo";
import { StorytellingVideo } from "./templates/StorytellingVideo";

export const VideoComposition: React.FC<VideoInputProps> = (props) => {
  switch (props.style) {
    case "fastCuts":
      return <FastCutsVideo {...props} />;
    case "storytelling":
      return <StorytellingVideo {...props} />;
    case "showcase":
    default:
      return <ShowcaseVideo {...props} />;
  }
};
