/**
 * SlashCommandExtension - TipTap extension for slash commands
 *
 * Triggers on `/` and shows a command menu for entity type selection.
 * After selecting a type, shows a search popover to find the specific entity.
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Editor } from '@tiptap/core';
import type { EntityType } from '@/lib/api';

export interface SlashCommandState {
  active: boolean;
  query: string;
  range: { from: number; to: number } | null;
  selectedType: EntityType | null;
}

export const slashCommandPluginKey = new PluginKey<SlashCommandState>('slashCommand');

export interface SlashCommandOptions {
  onStateChange?: (state: SlashCommandState) => void;
}

export const SlashCommandExtension = Extension.create<SlashCommandOptions>({
  name: 'slashCommand',

  addOptions() {
    return {
      onStateChange: undefined,
    };
  },

  addProseMirrorPlugins() {
    const { onStateChange } = this.options;

    return [
      new Plugin({
        key: slashCommandPluginKey,
        state: {
          init(): SlashCommandState {
            return {
              active: false,
              query: '',
              range: null,
              selectedType: null,
            };
          },
          apply(tr, state): SlashCommandState {
            const meta = tr.getMeta(slashCommandPluginKey);
            if (meta) {
              const newState = { ...state, ...meta };
              onStateChange?.(newState);
              return newState;
            }
            return state;
          },
        },
        props: {
          handleKeyDown(view, event) {
            const state = slashCommandPluginKey.getState(view.state);
            if (!state) return false;

            // If we're in the slash command mode, handle escape
            if (state.active && event.key === 'Escape') {
              view.dispatch(
                view.state.tr.setMeta(slashCommandPluginKey, {
                  active: false,
                  query: '',
                  range: null,
                  selectedType: null,
                })
              );
              return true;
            }

            return false;
          },
          handleTextInput(view, from, to, text) {
            const state = slashCommandPluginKey.getState(view.state);
            if (!state) return false;

            // Check if user typed `/`
            if (text === '/' && !state.active) {
              // Delay to let the character be inserted first
              setTimeout(() => {
                view.dispatch(
                  view.state.tr.setMeta(slashCommandPluginKey, {
                    active: true,
                    query: '',
                    range: { from: from, to: to + 1 },
                    selectedType: null,
                  })
                );
              }, 0);
              return false;
            }

            // If active, update the query
            if (state.active && state.range) {
              // Text is being added after the `/`
              setTimeout(() => {
                // Get the current text after `/`
                const $pos = view.state.doc.resolve(state.range!.from);
                const textAfterSlash = view.state.doc.textBetween(
                  state.range!.from,
                  view.state.selection.to,
                  ''
                );
                // Remove the leading `/`
                const query = textAfterSlash.slice(1);

                view.dispatch(
                  view.state.tr.setMeta(slashCommandPluginKey, {
                    ...state,
                    query,
                    range: { from: state.range!.from, to: view.state.selection.to },
                  })
                );
              }, 0);
            }

            return false;
          },
          decorations(state) {
            const pluginState = slashCommandPluginKey.getState(state);
            if (!pluginState?.active || !pluginState.range) {
              return DecorationSet.empty;
            }

            // Add a decoration to highlight the slash command text
            return DecorationSet.create(state.doc, [
              Decoration.inline(pluginState.range.from, pluginState.range.to, {
                class: 'slash-command-highlight',
              }),
            ]);
          },
        },
      }),
    ];
  },
});

// Helper functions to control the slash command state from outside
export function activateSlashCommand(editor: Editor) {
  const { view } = editor;
  view.dispatch(
    view.state.tr.setMeta(slashCommandPluginKey, {
      active: true,
      query: '',
      range: { from: view.state.selection.from, to: view.state.selection.from },
      selectedType: null,
    })
  );
}

export function deactivateSlashCommand(editor: Editor) {
  const { view } = editor;
  view.dispatch(
    view.state.tr.setMeta(slashCommandPluginKey, {
      active: false,
      query: '',
      range: null,
      selectedType: null,
    })
  );
}

export function setSelectedType(editor: Editor, type: EntityType | null) {
  const { view } = editor;
  const state = slashCommandPluginKey.getState(view.state);
  if (!state) return;

  view.dispatch(
    view.state.tr.setMeta(slashCommandPluginKey, {
      ...state,
      selectedType: type,
    })
  );
}

export function getSlashCommandState(editor: Editor): SlashCommandState | undefined {
  return slashCommandPluginKey.getState(editor.view.state);
}

export default SlashCommandExtension;
