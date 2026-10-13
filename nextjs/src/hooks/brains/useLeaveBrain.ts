import { useState } from "react";
import Toast from "@/utils/toast";
import { leaveBrainAction } from "@/actions/brains";

export const useLeaveBrain = ({
  onLeaveSuccess,
}: { onLeaveSuccess?: (brainId: string) => void } = {}) => {
  const [isLeaving, setIsLeaving] = useState(false);
  const [leftBrains, setLeftBrains] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      return JSON.parse(sessionStorage.getItem("leftBrains") || "[]");
    }
    return [];
  });

  const leaveBrain = async (brainId: string) => {
    setIsLeaving(true);
    try {
      const result = await leaveBrainAction(brainId);

      if (result?.status === 200) {
        Toast(result.message);

        const updatedLeftBrains = [...leftBrains, brainId];
        setLeftBrains(updatedLeftBrains);

        if (typeof window !== "undefined") {
          sessionStorage.setItem(
            "leftBrains",
            JSON.stringify(updatedLeftBrains)
          );
        }

        onLeaveSuccess?.(brainId);

        setTimeout(() => {
          window.location.href = "/";
        }, 1000);
      } else {
        throw new Error(result?.message);
      }
    } catch (error: any) {
      Toast(error?.message);
    } finally {
      setIsLeaving(false);
    }
  };

  const isBrainLeft = (brainId: string) => leftBrains.includes(brainId);

  const resetLeftBrain = (brainId: string) => {
    const updatedLeftBrains = leftBrains.filter((id) => id !== brainId);
    setLeftBrains(updatedLeftBrains);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("leftBrains", JSON.stringify(updatedLeftBrains));
    }
  };

  return { leaveBrain, isLeaving, isBrainLeft, resetLeftBrain, leftBrains };
};

export default useLeaveBrain;
