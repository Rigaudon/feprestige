"use client";

import type { SanityImageSource } from "@sanity/image-url";
import { Box, Card, Flex, Stack, Text, TextInput } from "@sanity/ui";
import { useCallback } from "react";
import { set, unset, type ArrayOfObjectsInputProps } from "sanity";

import { urlFor } from "@/sanity/image";

// Custom Studio input for the carousel's `images` array. It renders the normal
// array editor (upload / reorder / remove) via `renderDefault`, then adds a flat
// "Quick caption editor" so an editor can type every caption inline without
// opening each image in a modal and losing their place in a long drops gallery.
type CarouselImage = {
  _key: string;
  asset?: { _ref?: string };
  caption?: string;
  alt?: string;
};

export function CarouselCaptionsInput(props: ArrayOfObjectsInputProps) {
  const { onChange } = props;
  const value = (props.value as CarouselImage[] | undefined) ?? [];

  const setCaption = useCallback(
    (key: string, next: string) => {
      // Patch the caption of a single array member, addressed by its _key so it
      // stays correct even if the list is reordered.
      const path = [{ _key: key }, "caption"];
      onChange(next ? set(next, path) : unset(path));
    },
    [onChange],
  );

  // Only uploaded images can be captioned (skip empty / mid-upload members).
  const captionable = value.filter((item) => item?.asset?._ref);

  return (
    <Stack space={4}>
      {props.renderDefault(props)}

      {captionable.length > 0 && (
        <Card padding={3} radius={2} shadow={1} tone="transparent">
          <Stack space={3}>
            <Stack space={2}>
              <Text size={1} weight="semibold">
                Quick caption editor · {captionable.length} image
                {captionable.length === 1 ? "" : "s"}
              </Text>
              <Text size={1} muted>
                Edit every caption here without opening each image. Order matches
                the list above (the newest, last in the list, shows first in the
                carousel).
              </Text>
            </Stack>

            <Stack space={2}>
              {captionable.map((item) => (
                <Flex key={item._key} align="center" gap={3}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={urlFor(item as unknown as SanityImageSource)
                      .width(96)
                      .height(96)
                      .fit("crop")
                      .url()}
                    alt=""
                    width={44}
                    height={44}
                    style={{
                      width: 44,
                      height: 44,
                      flexShrink: 0,
                      objectFit: "cover",
                      borderRadius: 4,
                      display: "block",
                    }}
                  />
                  <Box flex={1}>
                    <TextInput
                      value={item.caption ?? ""}
                      placeholder="Add a caption…"
                      onChange={(event) =>
                        setCaption(item._key, event.currentTarget.value)
                      }
                    />
                  </Box>
                </Flex>
              ))}
            </Stack>
          </Stack>
        </Card>
      )}
    </Stack>
  );
}
