import { describe, expect, it } from "vitest";
import { filterSelectedSubjects, filterTopicsByLevel, isSubjectSelected } from "@/lib/subject-filter";

const subjects = [
  { id: "s1", name: "Physics" },
  { id: "s2", name: "Chemistry" },
  { id: "s3", name: "Business" },
];

describe("selected-subject filtering", () => {
  it("shows only the subjects saved on the profile", () => {
    expect(filterSelectedSubjects(subjects, ["s3", "s1"]).map((s) => s.name)).toEqual([
      "Physics",
      "Business",
    ]);
  });

  it("shows nothing when the user has not picked subjects yet", () => {
    expect(filterSelectedSubjects(subjects, [])).toEqual([]);
    expect(filterSelectedSubjects(subjects, null)).toEqual([]);
    expect(filterSelectedSubjects(subjects, undefined)).toEqual([]);
  });

  it("ignores stale ids that no longer exist", () => {
    expect(filterSelectedSubjects(subjects, ["gone", "s2"]).map((s) => s.id)).toEqual(["s2"]);
  });

  it("reports membership for a single subject", () => {
    expect(isSubjectSelected("s2", ["s1", "s2"])).toBe(true);
    expect(isSubjectSelected("s3", ["s1", "s2"])).toBe(false);
    expect(isSubjectSelected("s3", null)).toBe(false);
  });
});

describe("AS / A2 topic filtering", () => {
  const topics = [
    { id: "t1", name: "Kinematics", level: "as" as const },
    { id: "t2", name: "Circular motion", level: "a2" as const },
    { id: "t3", name: "Forces", level: "as" as const },
  ];

  it("AS only", () => {
    expect(filterTopicsByLevel(topics, "as").map((t) => t.id)).toEqual(["t1", "t3"]);
  });

  it("A2 only", () => {
    expect(filterTopicsByLevel(topics, "a2").map((t) => t.id)).toEqual(["t2"]);
  });

  it("full A-Level keeps both levels", () => {
    expect(filterTopicsByLevel(topics, "full")).toHaveLength(3);
  });
});
