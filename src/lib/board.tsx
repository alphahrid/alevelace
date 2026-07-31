import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Board = "cambridge" | "edexcel";

export const BOARD_LABEL: Record<Board, string> = {
  cambridge: "Cambridge (CAIE)",
  edexcel: "Pearson Edexcel",
};

export const BOARD_SHORT: Record<Board, string> = {
  cambridge: "CIE",
  edexcel: "Edexcel",
};

type Ctx = { board: Board; setBoard: (b: Board) => void; ready: boolean };

const BoardContext = createContext<Ctx>({ board: "cambridge", setBoard: () => {}, ready: false });

export function BoardProvider({ children }: { children: ReactNode }) {
  const [board, setBoardState] = useState<Board>("cambridge");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return setReady(true);
      const { data } = await supabase.from("profiles").select("exam_boards").eq("id", u.user.id).maybeSingle();
      const first = (data?.exam_boards as string[] | null)?.find((b) => b === "cambridge" || b === "edexcel");
      if (first) setBoardState(first as Board);
      setReady(true);
    })();
  }, []);

  const setBoard = useCallback((b: Board) => {
    setBoardState(b);
    void (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      await supabase.from("profiles").update({ exam_boards: [b] }).eq("id", u.user.id);
    })();
  }, []);

  return <BoardContext.Provider value={{ board, setBoard, ready }}>{children}</BoardContext.Provider>;
}

export function useBoard() {
  return useContext(BoardContext);
}
