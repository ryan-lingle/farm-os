/**
 * MentionExtension - Custom TipTap node for entity mentions
 *
 * Stores: type (asset|location|task|plan|log), id, label
 * Renders as: <span data-mention-type="asset" data-mention-id="123">icon + Laying Hens</span>
 */

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { MentionNodeView } from '../MentionNode';

export interface MentionAttributes {
  type: string;
  id: string;
  label: string;
  assetType?: string; // For assets, stores the specific asset type (animal, plant, etc.)
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mention: {
      /**
       * Insert a mention node
       */
      insertMention: (attributes: MentionAttributes) => ReturnType;
    };
  }
}

export const MentionExtension = Node.create({
  name: 'mention',

  group: 'inline',

  inline: true,

  selectable: true,

  atom: true, // Treated as a single unit (can't edit inside)

  addAttributes() {
    return {
      type: {
        default: 'asset',
        parseHTML: (element) => element.getAttribute('data-mention-type'),
        renderHTML: (attributes) => ({
          'data-mention-type': attributes.type,
        }),
      },
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-mention-id'),
        renderHTML: (attributes) => ({
          'data-mention-id': attributes.id,
        }),
      },
      label: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-mention-label') || element.textContent,
        renderHTML: (attributes) => ({
          'data-mention-label': attributes.label,
        }),
      },
      assetType: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-asset-type'),
        renderHTML: (attributes) => {
          if (!attributes.assetType) return {};
          return {
            'data-asset-type': attributes.assetType,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-mention-type][data-mention-id]',
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(
        {
          class: 'mention-node',
        },
        HTMLAttributes
      ),
      node.attrs.label || '',
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MentionNodeView);
  },

  addCommands() {
    return {
      insertMention:
        (attributes: MentionAttributes) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: attributes,
          });
        },
    };
  },
});

export default MentionExtension;
