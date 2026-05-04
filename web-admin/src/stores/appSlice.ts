import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface AppState {
    sidebarCollapsed: boolean;
}

const initialState: AppState = {
    sidebarCollapsed: false,
};

const appSlice = createSlice({
    name: 'app',
    initialState,
    reducers: {
        toggleSidebar(state) {
            state.sidebarCollapsed = !state.sidebarCollapsed;
        },
        setSidebarCollapsed(state, action: PayloadAction<boolean>) {
            state.sidebarCollapsed = action.payload;
        },
    },
});

export const { toggleSidebar, setSidebarCollapsed } = appSlice.actions;
export const appReducer = appSlice.reducer;
