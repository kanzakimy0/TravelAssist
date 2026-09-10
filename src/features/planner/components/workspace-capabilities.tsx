import { createContext, useContext } from "react";

export const WorkspaceCapabilities = createContext({
  canBook: false,
  routeQueriesEnabled: false,
  enterDetail: () => {},
});
export const useWorkspaceCapabilities = () => useContext(WorkspaceCapabilities);
