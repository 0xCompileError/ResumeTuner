import React from "react";

type Props = {
  message: string;
  show: boolean;
};

export default function Toast({ message, show }: Props) {
  return (
    <div className={`toast ${show ? "show" : ""}`} role="status" aria-live="polite">
      {message}
    </div>
  );
}

