"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FileScan, Info } from "lucide-react";
import { codesPdfGenerator } from "../lib/codes-pdf-generator";

const formSchema = z
  .object({
    listItems: z
      .string()
      .min(1, "Please enter at least one item")
      .refine((val) => val.trim().length > 0, {
        message: "List cannot be empty",
      }),
    title: z.string().optional(),
    pageSize: z.enum(["standard", "label70x100", "a4", "a3"]),
    codeSize: z.number().int(),
    fontSize: z.number().int(),
    spacing: z.number().int(),
    codeType: z.enum(["qr", "barcode", "dmc"]),
    orientation: z.enum(["portrait", "landscape"]),
    // DMC range fields
    dmcRangeStart: z.string().optional(), // Changed to string to preserve leading zeros
    dmcRangeEnd: z.string().optional(), // Changed to string to preserve leading zeros
    dmcUseRange: z.boolean(),
  })
  .refine(
    (data) => {
      if (data.codeType === "dmc" && data.dmcUseRange) {
        const start = data.dmcRangeStart
          ? parseInt(data.dmcRangeStart)
          : undefined;
        const end = data.dmcRangeEnd ? parseInt(data.dmcRangeEnd) : undefined;
        return start !== undefined && end !== undefined && start < end;
      }
      return true;
    },
    {
      message: "Range start must be less than range end",
      path: ["dmcRangeEnd"],
    },
  );

export default function QrGeneratorForm() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [dmcRangeInfo, setDmcRangeInfo] = useState<{
    isRange: boolean;
    count?: number;
    start?: number;
    end?: number;
  } | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      listItems: "",
      title: "",
      pageSize: "standard",
      codeSize: 85,
      fontSize: 48,
      spacing: 22,
      codeType: "qr",
      orientation: "portrait",
      dmcRangeStart: undefined,
      dmcRangeEnd: undefined,
      dmcUseRange: false,
    },
  });

  const selectedPageSize = form.watch("pageSize");
  const selectedCodeType = form.watch("codeType");
  const listItems = form.watch("listItems");
  const dmcUseRange = form.watch("dmcUseRange");
  const dmcRangeStart = form.watch("dmcRangeStart");
  const dmcRangeEnd = form.watch("dmcRangeEnd");

  // Check for DMC range info
  useEffect(() => {
    if (selectedCodeType === "dmc") {
      if (dmcUseRange && dmcRangeStart && dmcRangeEnd) {
        const start = parseInt(dmcRangeStart);
        const end = parseInt(dmcRangeEnd);
        const count = end - start + 1;
        setDmcRangeInfo({
          isRange: true,
          count,
          start,
          end,
        });
      } else if (!dmcUseRange && listItems) {
        const lines = listItems
          .split("\n")
          .filter((line) => line.trim().length > 0);
        setDmcRangeInfo({ isRange: false, count: lines.length });
      } else {
        setDmcRangeInfo(null);
      }
    } else {
      setDmcRangeInfo(null);
    }
  }, [selectedCodeType, dmcUseRange, dmcRangeStart, dmcRangeEnd, listItems]);

  useEffect(() => {
    if (selectedCodeType === "dmc") {
      // For DMC, force specific settings
      form.setValue("pageSize", "standard"); // Will be overridden to 15x15 in generator
      form.setValue("orientation", "portrait");
      form.setValue("codeSize", 10);
      form.setValue("fontSize", 0); // No text for DMC
      form.setValue("spacing", 0);
    } else if (selectedPageSize === "standard") {
      form.setValue("codeSize", 85);
      form.setValue("fontSize", 48);
      form.setValue("spacing", 22);
    } else if (selectedPageSize === "label70x100") {
      form.setValue("codeSize", 44);
      form.setValue("fontSize", 26);
      form.setValue("spacing", 10);
    } else if (selectedPageSize === "a4") {
      form.setValue("codeSize", 190);
      form.setValue("fontSize", 105);
      form.setValue("spacing", 80);
    } else if (selectedPageSize === "a3") {
      form.setValue("codeSize", 270);
      form.setValue("fontSize", 150);
      form.setValue("spacing", 120);
    }
  }, [selectedPageSize, selectedCodeType, form]);

  const onSubmit = useCallback(
    async (values: z.infer<typeof formSchema>) => {
      if (isGenerating) return;

      try {
        setIsGenerating(true);

        let items: string[] = [];

        if (values.codeType === "dmc" && values.dmcUseRange) {
          // Generate DMC range from pattern
          const pattern = values.listItems.trim();
          if (!pattern) {
            toast.error("Please enter a DMC pattern");
            return;
          }

          const startStr = values.dmcRangeStart!;
          const endStr = values.dmcRangeEnd!;
          const start = parseInt(startStr);
          const end = parseInt(endStr);
          const count = end - start + 1;

          if (count > 1000) {
            toast.error("DMC range too large (max 1000 codes)");
            return;
          }

          // Determine padding length from the longer of start/end strings
          const paddingLength = Math.max(startStr.length, endStr.length);

          // Generate codes by replacing XYZ with padded numbers
          for (let i = start; i <= end; i++) {
            const paddedNumber = i.toString().padStart(paddingLength, "0");
            const code = pattern.replace(/XYZ/g, paddedNumber);
            items.push(code);
          }
        } else {
          // Regular item processing
          items = values.listItems
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0);
        }

        if (items.length === 0) {
          toast.error("Please enter at least one item");
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, 50));

        await codesPdfGenerator({
          items,
          title: values.title || "Codes",
          pageSize: values.pageSize,
          codeSize: values.codeSize,
          fontSize: values.fontSize,
          spacing: values.spacing,
          codeType: values.codeType,
          orientation: values.orientation,
          isCodeRange: values.dmcUseRange || false,
        });

        const codeCount = items.length;
        toast.success(`PDF generated successfully with ${codeCount} codes!`);
      } catch (error) {
        console.error("Error generating PDF:", error);
        toast.error("Failed to generate PDF");
      } finally {
        setIsGenerating(false);
      }
    },
    [isGenerating],
  );

  return (
    <Card className="sm:w-[768px]">
      <CardHeader>
        <CardTitle>Code Generator</CardTitle>
        <CardDescription>
          {selectedCodeType === "dmc"
            ? "Enter DMC patterns using XYZ as placeholder for numbers, then set range below. Supports leading zeros (e.g., 001-005)."
            : "Enter a list of items (one per line) to generate QR codes or barcodes"}
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="grid w-full items-center gap-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Document Title (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="QR Codes" {...field} />
                  </FormControl>
                  <FormDescription>
                    This will appear as the title of the PDF document
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="codeType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select code type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="qr">QR Code</SelectItem>
                      <SelectItem value="barcode">Barcode</SelectItem>
                      <SelectItem value="dmc">DMC (Data Matrix)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose between QR code, barcode, or DMC
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="pageSize"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Page Size</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value || "standard"}
                    disabled={selectedCodeType === "dmc"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a verified email to display" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="standard">
                        {selectedCodeType === "dmc"
                          ? "DMC Fixed Size (15x15 mm)"
                          : "Standard (125x104 mm - production label)"}
                      </SelectItem>
                      <SelectItem value="label70x100">70x100 mm</SelectItem>
                      <SelectItem value="a4">A4 (210x297 mm)</SelectItem>
                      <SelectItem value="a3">A3 (297x420 mm)</SelectItem>
                    </SelectContent>
                  </Select>
                  {selectedCodeType === "dmc" && (
                    <FormDescription>
                      DMC uses fixed 15x15 mm paper size
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="orientation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Orientation</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={selectedCodeType === "dmc"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select orientation" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="portrait">Portrait</SelectItem>
                      <SelectItem value="landscape">Landscape</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {selectedCodeType === "dmc"
                      ? "DMC uses fixed orientation"
                      : "Choose page orientation"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="codeSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code Size (mm)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value))
                        }
                        disabled={selectedCodeType === "dmc"}
                      />
                    </FormControl>
                    <FormDescription>
                      {selectedCodeType === "dmc"
                        ? "DMC fixed at 10x10 mm"
                        : "Size of code in millimeters"}
                    </FormDescription>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fontSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Font Size (pt)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value))
                        }
                        disabled={selectedCodeType === "dmc"}
                      />
                    </FormControl>
                    <FormDescription>
                      {selectedCodeType === "dmc"
                        ? "No text for DMC"
                        : "Size of text below code"}
                    </FormDescription>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="spacing"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Spacing (mm)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value))
                        }
                        disabled={selectedCodeType === "dmc"}
                      />
                    </FormControl>
                    <FormDescription>
                      {selectedCodeType === "dmc"
                        ? "No spacing for DMC"
                        : "Space between code and text"}
                    </FormDescription>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="listItems"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {selectedCodeType === "dmc"
                      ? "DMC Pattern"
                      : "List of Items"}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={
                        selectedCodeType === "dmc"
                          ? "Enter DMC pattern with XYZ placeholder...\nExample: P32402738#TPPXYZ#VEXRGA#"
                          : "Enter items (one per line)..."
                      }
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {selectedCodeType === "dmc"
                      ? 'Use XYZ as placeholder for numbers. Example: "P32402738#TPPXYZ#VEXRGA#" becomes "P32402738#TPP001#VEXRGA#" etc. Supports ranges like 001-005 or 500-850 with proper padding.'
                      : "Each line will be converted to a code on a separate page"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* DMC Range Controls */}
            {selectedCodeType === "dmc" && (
              <FormField
                control={form.control}
                name="dmcUseRange"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-y-0 space-x-3">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Use Range Generation</FormLabel>
                      <FormDescription>
                        Generate multiple codes by replacing XYZ with sequential
                        numbers. Supports leading zeros: enter "001" to "005"
                        for 001, 002, 003, 004, 005
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            )}

            {selectedCodeType === "dmc" && dmcUseRange && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="dmcRangeStart"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Range Start</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="001 or 500"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription>
                        Starting number (supports leading zeros: 001, 0500,
                        etc.)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dmcRangeEnd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Range End</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="005 or 850"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription>
                        Ending number (will match start format: 005, 0850, etc.)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* DMC Range Info Alert */}
            {selectedCodeType === "dmc" && dmcRangeInfo && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  {dmcRangeInfo.isRange ? (
                    <>
                      <strong>Range generation:</strong> {dmcRangeInfo.count}{" "}
                      codes will be generated (from {dmcRangeInfo.start} to{" "}
                      {dmcRangeInfo.end})
                      <br />
                      <small className="text-muted-foreground">
                        XYZ will be replaced with properly padded numbers:{" "}
                        {dmcRangeStart?.padStart(
                          Math.max(
                            dmcRangeStart?.length || 0,
                            dmcRangeEnd?.length || 0,
                          ),
                          "0",
                        )}{" "}
                        through{" "}
                        {dmcRangeEnd?.padStart(
                          Math.max(
                            dmcRangeStart?.length || 0,
                            dmcRangeEnd?.length || 0,
                          ),
                          "0",
                        )}
                        <br />
                        Format examples: 001-005 → 001, 002, 003, 004, 005 |
                        500-502 → 500, 501, 502
                      </small>
                    </>
                  ) : (
                    <>
                      <strong>Individual codes:</strong>{" "}
                      {dmcRangeInfo.count || 1} codes will be generated
                    </>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isGenerating}>
              <FileScan className={isGenerating ? "animate-spin" : ""} />{" "}
              Generate{" "}
              {dmcRangeInfo?.count && dmcRangeInfo.count > 1
                ? `${dmcRangeInfo.count} `
                : ""}
              {form.watch("codeType") === "qr"
                ? "QR Code"
                : form.watch("codeType") === "barcode"
                  ? "Barcode"
                  : "DMC"}{" "}
              PDF{dmcRangeInfo?.count && dmcRangeInfo.count > 1 ? "s" : ""}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
