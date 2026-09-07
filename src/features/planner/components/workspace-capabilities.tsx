import { createContext, useContext } from "react";

export const WorkspaceCapabilities = createContext({
  canBook: false,
  enterDetail: () => {},
});
export const useWorkspaceCapabilities = () => useContext(WorkspaceCapabilities);
