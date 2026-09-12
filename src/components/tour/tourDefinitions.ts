export type TourPlacement = "top" | "bottom" | "left" | "right";

export type TourStep = {
  target: string;
  title: string;
  description: string;
  placement?: TourPlacement;
};

export type TourDefinition = {
  id: string;
  name: string;
  route: string;
  steps: TourStep[];
};

export const TOUR_DEFINITIONS: TourDefinition[] = [
  {
    id: "dashboard",
    name: "Dashboard tour",
    route: "/dashboard",
    steps: [
      {
        target: "dashboard-overview",
        title: "Your WFICM workspace",
        description:
          "Your main workspace for accessing songs, worship sets, and recent activity.",
      },
      {
        target: "dashboard-create-song",
        title: "Create a song",
        description:
          "Start a new song by pasting lyrics and letting WFICM organize the sections.",
      },
      {
        target: "dashboard-recent-songs",
        title: "Recent songs",
        description: "Quickly return to songs you have recently worked on.",
      },
      {
        target: "dashboard-recent-sets",
        title: "Worship sets",
        description:
          "Open recent worship sets or build a complete service presentation.",
      },
    ],
  },
  {
    id: "songs",
    name: "Song library tour",
    route: "/songs",
    steps: [
      {
        target: "songs-create",
        title: "Create Song",
        description: "Add a new song to your church song library.",
      },
      {
        target: "songs-search",
        title: "Search your library",
        description: "Search songs by title or artist.",
      },
      {
        target: "songs-list",
        title: "Your song list",
        description:
          "Open a song to edit lyrics, presentation settings, and slides.",
      },
    ],
  },
  {
    id: "create-song",
    name: "Create Song tour",
    route: "/songs/new",
    steps: [
      {
        target: "create-song-title",
        title: "Song title",
        description: "Give the song a clear title so it is easy to find later.",
      },
      {
        target: "create-song-lyrics",
        title: "Lyrics",
        description:
          "Paste the full lyrics here. WFICM analyzes the text and organizes it into editable sections.",
      },
      {
        target: "create-song-duplicates",
        title: "Duplicate lyrics",
        description:
          "Optionally remove repeated lyric blocks from pasted text before creating the song.",
      },
      {
        target: "create-song-submit",
        title: "Analyze Lyrics",
        description: "Create the song and let WFICM detect its sections.",
      },
    ],
  },
  {
    id: "song-editor",
    name: "Song Editor tour",
    route: "/songs/",
    steps: [
      {
        target: "song-editor-title",
        title: "Song details",
        description:
          "Edit the song title and artist. Changes are saved automatically.",
      },
      {
        target: "song-editor-sections",
        title: "Sections and lyrics",
        description:
          "Edit each lyric section here. Changes are automatically saved.",
      },
      {
        target: "song-editor-preview",
        title: "Preview",
        description: "See how your lyrics will appear on presentation slides.",
      },
      {
        target: "song-editor-settings",
        title: "Presentation Settings",
        description:
          "Control the visual appearance of your slides, including themes, typography, and backgrounds.",
        placement: "left",
      },
      {
        target: "preset-themes",
        title: "Preset Themes",
        description:
          "Choose a ready-made visual style, then customize the settings afterward if you like.",
      },
      {
        target: "song-editor-generate",
        title: "Generate PowerPoint",
        description: "Export the same slide design as a PowerPoint file.",
      },
    ],
  },
  {
    id: "worship-sets",
    name: "Worship Sets tour",
    route: "/worship-sets",
    steps: [
      {
        target: "worship-sets-create",
        title: "Create Worship Set",
        description:
          "Start a complete service presentation from your song library.",
      },
      {
        target: "worship-sets-list",
        title: "Your worship sets",
        description: "Open, present, export, or remove a saved set.",
      },
    ],
  },
  {
    id: "worship-set-editor",
    name: "Worship Set Editor tour",
    route: "/worship-sets/",
    steps: [
      {
        target: "worship-set-name",
        title: "Set name",
        description:
          "Name the service or worship set. Changes save automatically.",
      },
      {
        target: "worship-set-add-songs",
        title: "Add songs",
        description: "Choose songs from your library to include in the set.",
      },
      {
        target: "worship-set-order",
        title: "Arrange the service",
        description: "Drag songs to arrange the order of your service.",
      },
      {
        target: "worship-set-settings",
        title: "Set presentation settings",
        description: "Choose the visual style for the full worship set.",
      },
      {
        target: "worship-set-preview",
        title: "Set preview",
        description: "Review the slides for every song in the set.",
      },
      {
        target: "worship-set-present",
        title: "Present the set",
        description: "Open the set in a separate presentation window.",
      },
    ],
  },
  {
    id: "settings",
    name: "Settings tour",
    route: "/settings",
    steps: [
      {
        target: "settings-profile",
        title: "Your profile",
        description: "Update the name associated with your WFICM account.",
      },
      {
        target: "settings-appearance",
        title: "Appearance",
        description: "Choose light or dark mode for the application.",
      },
    ],
  },
  {
    id: "presentation-mode",
    name: "Presentation Mode tour",
    route: "/worship-sets/",
    steps: [
      {
        target: "worship-set-present",
        title: "Presentation Mode",
        description:
          "Use the separate presentation window on a projector or second monitor while keeping WFICM controls on your main screen.",
      },
      {
        target: "worship-set-preview",
        title: "Presenter preview",
        description:
          "Navigate the current set with the same slide model used for your exported presentation.",
      },
    ],
  },
];

export function getTourForPath(pathname: string): TourDefinition | null {
  return (
    TOUR_DEFINITIONS.find((tour) => {
      if (tour.route.endsWith("/"))
        return (
          pathname.startsWith(tour.route) &&
          pathname !== tour.route.slice(0, -1)
        );
      return pathname === tour.route;
    }) ?? null
  );
}

export function getTour(id: string): TourDefinition | null {
  return TOUR_DEFINITIONS.find((tour) => tour.id === id) ?? null;
}
