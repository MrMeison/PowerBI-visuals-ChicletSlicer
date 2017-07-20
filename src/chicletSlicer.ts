/*
 *  Power BI Visualizations
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved.
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ""Software""), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */

module powerbi.extensibility.visual {
    // d3
    import Selection = d3.Selection;
    import UpdateSelection = d3.selection.Update;

    // powerbi.data
    import ISQExpr = powerbi.data.ISQExpr;
    import ISemanticFilter = powerbi.data.ISemanticFilter;

    // powerbi.extensibility.utils.type
    import PixelConverter = powerbi.extensibility.utils.type.PixelConverter;

    // powerbi.extensibility.utils.interactivity
    import SelectableDataPoint = powerbi.extensibility.utils.interactivity.SelectableDataPoint;
    import IInteractivityService = powerbi.extensibility.utils.interactivity.IInteractivityService;
    import createInteractivityService = powerbi.extensibility.utils.interactivity.createInteractivityService;

    // powerbi.extensibility.utils.svg
    import ClassAndSelector = powerbi.extensibility.utils.svg.CssConstants.ClassAndSelector;
    import createClassAndSelector = powerbi.extensibility.utils.svg.CssConstants.createClassAndSelector;

    // powerbi.extensibility.utils.color
    import hexToRGBString = powerbi.extensibility.utils.color.hexToRGBString;

    // powerbi.extensibility.utils.formatting
    import valueFormatter = powerbi.extensibility.utils.formatting.valueFormatter;
    import TextProperties = powerbi.extensibility.utils.formatting.TextProperties;
    import textMeasurementService = powerbi.extensibility.utils.formatting.textMeasurementService;

    export interface ChicletSlicerData {
        categorySourceName: string;
        formatString: string;
        slicerDataPoints: ChicletSlicerDataPoint[];
        slicerSettings: ChicletSlicerSettings;
        hasSelectionOverride?: boolean;
        hasHighlights: boolean;
        identityFields: ISQExpr[];
    }

    export interface ChicletSlicerDataPoint extends SelectableDataPoint {
        category?: string;
        value?: number;
        mouseOver?: boolean;
        mouseOut?: boolean;
        isSelectAllDataPoint?: boolean;
        imageURL?: string;
        selectable?: boolean;
        filtered?: boolean;
        url?: string;
    }

    export class ChicletSlicer implements IVisual {
        private $root: JQuery;
        private $searchHeader: JQuery;
        private $searchInput: JQuery;
        private currentViewport: IViewport;
        private dataView: DataView;
        private slicerHeader: Selection<any>;
        private slicerBody: Selection<any>;
        private tableView: ITableView;
        private slicerData: ChicletSlicerData;
        private interactivityService: IInteractivityService;
        private visualHost: IVisualHost;
        private waitingForData: boolean;
        private isSelectionLoaded: boolean;
        private isSelectionSaved: boolean;

        /**
         * It"s public for testability.
         */
        public behavior: ChicletSlicerWebBehavior;

        /**
         * It"s public for testability.
         */
        public settings: ChicletSlicerSettings;

        public static DefaultFontFamily: string = "helvetica, arial, sans-serif";
        public static DefaultFontSizeInPt: number = 11;

        private static СellTotalInnerPaddings: number = 8;
        private static СellTotalInnerBorders: number = 2;
        private static СhicletTotalInnerRightLeftPaddings: number = 14;

        public static MinImageSplit: number = 0;
        public static MinImageSplitToHide: number = 10;
        public static MaxImageSplit: number = 100;
        public static MaxImageSplitToHide: number = 90;
        public static MaxImageWidth: number = 100;

        public static MaxTransparency: number = 100;

        private static MaxCellPadding: number = 20;
        private static MinSizeOfViewport: number = 0;
        private static MinColumns: number = 1;

        private static MaxColumns: number = 1000;
        private static MaxRows: number = 1000;

        private static WidthOfScrollbar: number = 17;

        public static ItemContainerSelector: ClassAndSelector = createClassAndSelector("slicerItemContainer");
        public static SlicerLinkWrapperSelector: ClassAndSelector = createClassAndSelector("slicer-link-wrapper");
        public static SlicerImgWrapperSelector: ClassAndSelector = createClassAndSelector("slicer-img-wrapper");
        public static SlicerTextWrapperSelector: ClassAndSelector = createClassAndSelector("slicer-text-wrapper");
        public static SlicerBodyHorizontalSelector: ClassAndSelector = createClassAndSelector("slicerBody-horizontal");
        public static SlicerBodyVerticalSelector: ClassAndSelector = createClassAndSelector("slicerBody-vertical");
        public static HeaderTextSelector: ClassAndSelector = createClassAndSelector("headerText");
        public static ContainerSelector: ClassAndSelector = createClassAndSelector("chicletSlicer");
        public static LabelTextSelector: ClassAndSelector = createClassAndSelector("slicerText");
        public static HeaderSelector: ClassAndSelector = createClassAndSelector("slicerHeader");
        public static InputSelector: ClassAndSelector = createClassAndSelector("slicerCheckbox");
        public static ClearSelector: ClassAndSelector = createClassAndSelector("clear");
        public static BodySelector: ClassAndSelector = createClassAndSelector("slicerBody");

        /**
         * Public to testability.
         */
        public static getValidImageSplit(imageSplit): number {
            if (imageSplit < ChicletSlicer.MinImageSplit) {
                return ChicletSlicer.MinImageSplit;
            } else if (imageSplit > ChicletSlicer.MaxImageSplit) {
                return ChicletSlicer.MaxImageSplit;
            } else {
                return imageSplit;
            }
        }

        public static converter(
            dataView: DataView,
            searchText: string,
            visualHost: IVisualHost): ChicletSlicerData {

            if (!dataView ||
                !dataView.categorical ||
                !dataView.categorical.categories ||
                !dataView.categorical.categories[0] ||
                !dataView.categorical.categories[0].values ||
                !(dataView.categorical.categories[0].values.length > 0)) {
                return;
            }
            let slicerData: ChicletSlicerData;
            const converter: ChicletSlicerConverter = new ChicletSlicerConverter(dataView, visualHost);
            const settings: ChicletSlicerSettings = ChicletSlicerSettings.parse<ChicletSlicerSettings>(dataView);
            converter.convert();

            if (settings.system.selfFilterEnabled && searchText) {
                searchText = searchText.toLowerCase();
                converter.dataPoints.forEach(x => x.filtered = x.category.toLowerCase().indexOf(searchText) < 0);
            }

            let categories: DataViewCategoricalColumn = dataView.categorical.categories[0];

            slicerData = {
                categorySourceName: categories.source.displayName,
                formatString: valueFormatter.getFormatStringByColumn(categories.source),
                slicerSettings: settings,
                slicerDataPoints: converter.dataPoints,
                identityFields: converter.identityFields,
                hasHighlights: converter.hasHighlights
            };

            // Override hasSelection if a objects contained more scopeIds than selections we found in the data
            slicerData.hasSelectionOverride = converter.hasSelectionOverride;

            return slicerData;
        }
        constructor(options: VisualConstructorOptions) {
            this.$root = $(options.element);

            this.visualHost = options.host;

            this.behavior = new ChicletSlicerWebBehavior();
            this.interactivityService = createInteractivityService(options.host);
        }

        public update(options: VisualUpdateOptions) {
            if (!options ||
                !options.dataViews ||
                !options.dataViews[0] ||
                !options.viewport) {
                return;
            }
            this.settings = this.parseSettings(options.dataViews[0]);

            if (!this.currentViewport) {
                this.currentViewport = options.viewport;
                this.initContainer();
            }

            const existingDataView = this.dataView;
            this.dataView = options.dataViews[0];

            let resetScrollbarPosition: boolean = true;

            if (existingDataView) {
                resetScrollbarPosition = !ChicletSlicer.hasSameCategoryIdentity(existingDataView, this.dataView);
            }

            if (options.viewport.height === this.currentViewport.height
                && options.viewport.width === this.currentViewport.width) {
                this.waitingForData = false;
            }
            else {
                this.currentViewport = options.viewport;
            }

            this.updateInternal(resetScrollbarPosition);
        }

        private static hasSameCategoryIdentity(dataView1: DataView, dataView2: DataView): boolean {
            if (!dataView1 ||
                !dataView2 ||
                !dataView1.categorical ||
                !dataView2.categorical) {
                return false;
            }

            let dv1Categories: DataViewCategoricalColumn[] = dataView1.categorical.categories;
            let dv2Categories: DataViewCategoricalColumn[] = dataView2.categorical.categories;

            if (!dv1Categories ||
                !dv2Categories ||
                dv1Categories.length !== dv2Categories.length) {
                return false;
            }

            for (let i: number = 0, len: number = dv1Categories.length; i < len; i++) {
                let dv1Identity: DataViewScopeIdentity[] = (<DataViewCategoryColumn>dv1Categories[i]).identity;
                let dv2Identity: DataViewScopeIdentity[] = (<DataViewCategoryColumn>dv2Categories[i]).identity;

                let dv1Length: number = this.getLengthOptional(dv1Identity);
                if ((dv1Length < 1) || dv1Length !== this.getLengthOptional(dv2Identity)) {
                    return false;
                }

                for (let j: number = 0; j < dv1Length; j++) {
                    if (!_.isEqual(dv1Identity[j].key, dv2Identity[j].key)) {
                        return false;
                    }
                }
            }

            return true;
        }

        private static getLengthOptional(identity: DataViewScopeIdentity[]): number {
            if (identity) {
                return identity.length;
            }
            return 0;
        }

        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstanceEnumeration {
            if (options.objectName === "system") {
                return [];
            }
            return ChicletSlicerSettings.enumerateObjectInstances(
                this.settings || ChicletSlicerSettings.getDefault(),
                options);
        }

        private updateInternal(resetScrollbarPosition: boolean) {
            let data = ChicletSlicer.converter(
                this.dataView,
                this.$searchInput.val(),
                this.visualHost);

            if (!data) {
                this.tableView.empty();

                return;
            }
            data.slicerSettings.system.setSavedSelection = (filter: ISemanticFilter, selectionIds: string[]): void => {
                this.isSelectionSaved = true;
                this.visualHost.persistProperties(<VisualObjectInstancesToPersist>{
                    merge: [{
                        objectName: "system",
                        selector: null,
                        properties: {
                            // filter: filter || null,
                            selection: selectionIds && JSON.stringify(selectionIds) || ""
                        }
                    }]
                });
            };
            ChicletSlicer.validateSettings(data.slicerSettings);



            if (this.slicerData) {
                if (this.isSelectionSaved) {
                    this.isSelectionLoaded = true;
                } else {
                    this.isSelectionLoaded = this.slicerData.slicerSettings.system.selection === data.slicerSettings.system.selection;
                }
            } else {
                this.isSelectionLoaded = false;
            }

            this.slicerData = data;
            this.settings = this.slicerData.slicerSettings;
            this.settings.header.title = this.settings.header.title.trim() || this.slicerData.categorySourceName;

            this.updateSearchHeader();
            this.updateSlicerBodyDimensions();

            if (this.settings.general.showDisabled === ChicletSlicerShowDisabled.BOTTOM) {
                data.slicerDataPoints = _.sortBy(data.slicerDataPoints, [x => !x.selectable]);
            } else if (this.settings.general.showDisabled === ChicletSlicerShowDisabled.HIDE) {
                data.slicerDataPoints = data.slicerDataPoints.filter(x => x.selectable);
            }

            if (this.settings.slicerText.height === ChicletSlicer.MinImageSplit) {
                let extraSpaceForCell = ChicletSlicer.СellTotalInnerPaddings + ChicletSlicer.СellTotalInnerBorders,
                    textProperties: TextProperties = ChicletSlicer.getChicletTextProperties(+this.settings.slicerText.textSize);

                this.settings.slicerText.height = textMeasurementService.estimateSvgTextHeight(textProperties) +
                    textMeasurementService.estimateSvgTextBaselineDelta(textProperties) +
                    extraSpaceForCell;

                let hasImage: boolean = _.some(data.slicerDataPoints, (dataPoint: ChicletSlicerDataPoint) => {
                    return dataPoint.imageURL !== "" && typeof dataPoint.imageURL !== "undefined";
                });

                if (hasImage) {
                    this.settings.slicerText.height += ChicletSlicer.MaxImageSplit;
                }
            }

            this.tableView
                .rowHeight(this.settings.slicerText.height)
                .columnWidth(this.settings.slicerText.width)
                .orientation(this.settings.general.orientation)
                .rows(this.settings.general.rows)
                .columns(this.settings.general.columns)
                .data(
                data.slicerDataPoints.filter(x => !x.filtered),
                (d: ChicletSlicerDataPoint) => $.inArray(d, data.slicerDataPoints),
                resetScrollbarPosition)
                .viewport(this.getSlicerBodyViewport(this.currentViewport))
                .render();
        }

        private initContainer() {
            let settings: ChicletSlicerSettings = this.settings,
                slicerBodyViewport: IViewport = this.getSlicerBodyViewport(this.currentViewport);

            let slicerContainer: Selection<any> = d3.select(this.$root.get(0))
                .append("div")
                .classed(ChicletSlicer.ContainerSelector.className, true);

            this.slicerHeader = slicerContainer
                .append("div")
                .classed(ChicletSlicer.HeaderSelector.className, true);

            this.slicerHeader
                .append("span")
                .classed(ChicletSlicer.ClearSelector.className, true)
                .attr("title", "Clear");

            this.slicerHeader
                .append("div")
                .classed(ChicletSlicer.HeaderTextSelector.className, true)
                .style({
                    "margin-left": PixelConverter.toString(settings.headerText.marginLeft),
                    "margin-top": PixelConverter.toString(settings.headerText.marginTop),
                    "border-style": ChicletSlicer.getBorderStyle(settings.header.outline),
                    "border-color": settings.header.outlineColor,
                    "border-width": ChicletSlicer.getBorderWidth(settings.header.outline, settings.header.outlineWeight),
                    "font-size": PixelConverter.fromPoint(+settings.header.textSize),
                });

            this.createSearchHeader($(slicerContainer.node()));

            this.slicerBody = slicerContainer
                .append("div")
                .classed(ChicletSlicer.BodySelector.className, true)
                .classed(
                ChicletSlicer.SlicerBodyHorizontalSelector.className,
                settings.general.orientation === Orientation.HORIZONTAL)
                .classed(
                ChicletSlicer.SlicerBodyVerticalSelector.className,
                settings.general.orientation === Orientation.VERTICAL
                )
                .style({
                    "height": PixelConverter.toString(slicerBodyViewport.height),
                    "width": `${ChicletSlicer.MaxImageWidth}%`,
                });

            let rowEnter = (rowSelection: Selection<any>) => {
                this.enterSelection(rowSelection);
            };

            let rowUpdate = (rowSelection: Selection<any>) => {
                this.updateSelection(rowSelection);
            };

            let rowExit = (rowSelection: Selection<any>) => {
                rowSelection.remove();
            };

            let tableViewOptions: TableViewViewOptions = {
                rowHeight: this.getRowHeight(),
                columnWidth: this.settings.slicerText.width,
                orientation: this.settings.general.orientation,
                rows: this.settings.general.rows,
                columns: this.settings.general.columns,
                enter: rowEnter,
                exit: rowExit,
                update: rowUpdate,
                scrollEnabled: true,
                viewport: this.getSlicerBodyViewport(this.currentViewport),
                baseContainer: this.slicerBody,
            };

            this.tableView = TableViewFactory.createTableView(tableViewOptions);
        }

        private enterSelection(rowSelection: Selection<any>): void {
            let settings: ChicletSlicerSettings = this.settings;
            rowSelection.selectAll("ul")
                .remove();
            let ulItemElement: UpdateSelection<any> = rowSelection
                .selectAll("ul")
                .data((dataPoint: ChicletSlicerDataPoint) => {
                    return [dataPoint];
                }, (d: ChicletSlicerDataPoint) => d.imageURL);

            ulItemElement
                .enter()
                .append("ul");

            ulItemElement
                .exit()
                .remove();

            let listItemElement: UpdateSelection<any> = ulItemElement
                .selectAll(ChicletSlicer.ItemContainerSelector.selectorName)
                .data((dataPoint: ChicletSlicerDataPoint) => {
                    return [dataPoint];
                });

            listItemElement
                .enter()
                .append("li")
                .classed(ChicletSlicer.ItemContainerSelector.className, true)
                .style({
                    "margin-left": PixelConverter.toString(settings.slicerItemContainer.marginLeft)
                });

            listItemElement
                .append("img")
                .classed(ChicletSlicer.SlicerImgWrapperSelector.className, true);


            listItemElement
                .append("label")
                .classed(ChicletSlicer.SlicerTextWrapperSelector.className, true)
                .style({
                    "font-size": PixelConverter.fromPoint(+settings.slicerText.textSize),
                    "color": settings.slicerText.fontColor
                })
                .append("a")
                .classed(ChicletSlicer.LabelTextSelector.className, true)
                .classed(ChicletSlicer.LabelTextSelector.className, true)
                .attr("rel", (d: ChicletSlicerDataPoint) => "noopener noreferrer")
                .attr("href", (d: ChicletSlicerDataPoint) => this.settings.images.clickableImage && d.url ? d.url : null)
                .attr("target", (d: ChicletSlicerDataPoint) => d.url ? "_blank" : null)
                .attr("title", (d: ChicletSlicerDataPoint) => d.url ? `Click to navigate to: ${d.url}` : null);

            listItemElement
                .exit()
                .remove();
        }

        private updateSelection(rowSelection: Selection<any>): void {
            let settings: ChicletSlicerSettings = this.settings,
                data: ChicletSlicerData = this.slicerData;

            if (data && settings) {
                this.slicerHeader
                    .classed("hidden", !settings.header.show);

                this.slicerHeader
                    .select(ChicletSlicer.HeaderTextSelector.selectorName)
                    .text(settings.header.title.trim())
                    .style({
                        "border-style": ChicletSlicer.getBorderStyle(settings.header.outline),
                        "border-color": settings.header.outlineColor,
                        "border-width": ChicletSlicer.getBorderWidth(settings.header.outline, settings.header.outlineWeight),
                        "color": settings.header.fontColor,
                        "background-color": settings.header.background,
                        "font-size": PixelConverter.fromPoint(+settings.header.textSize),
                    });

                this.slicerBody
                    .classed(
                    ChicletSlicer.SlicerBodyHorizontalSelector.className,
                    settings.general.orientation === Orientation.HORIZONTAL)
                    .classed(
                    ChicletSlicer.SlicerBodyVerticalSelector.className,
                    settings.general.orientation === Orientation.VERTICAL);

                let slicerText: Selection<any> = rowSelection.selectAll(ChicletSlicer.LabelTextSelector.selectorName),
                    textProperties: TextProperties = ChicletSlicer.getChicletTextProperties(+settings.slicerText.textSize),
                    formatString: string = data.formatString;

                let slicerBodyViewport: IViewport = this.getSlicerBodyViewport(this.currentViewport);
                slicerText.text((d: ChicletSlicerDataPoint) => {
                    textProperties.text = valueFormatter.format(d.category, formatString);

                    if (this.settings.slicerText.width === 0) {
                        this.settings.slicerText.width = Math.round(
                            slicerBodyViewport.width / (this.tableView.computedColumns || ChicletSlicer.MinColumns)
                        );
                    }

                    let maxWidth: number = this.settings.slicerText.width -
                        ChicletSlicer.СhicletTotalInnerRightLeftPaddings -
                        ChicletSlicer.СellTotalInnerBorders -
                        settings.slicerText.outlineWeight;

                    return textMeasurementService.getTailoredTextOrDefault(textProperties, maxWidth);
                });

                rowSelection
                    .style({
                        "padding": PixelConverter.toString(settings.slicerText.padding)
                    });

                rowSelection
                    .selectAll(ChicletSlicer.SlicerImgWrapperSelector.selectorName)
                    .style({
                        "max-height": settings.images.imageSplit + "%",
                        "display": (dataPoint: ChicletSlicerDataPoint) => (dataPoint.imageURL)
                            ? "flex"
                            : "none"
                    })
                    .classed({
                        "hidden": (dataPoint: ChicletSlicerDataPoint) => {
                            if (!(dataPoint.imageURL)) {
                                return true;
                            }

                            if (settings.images.imageSplit < ChicletSlicer.MinImageSplitToHide) {
                                return true;
                            }
                        },
                        "stretchImage": settings.images.stretchImage,
                        "bottomImage": settings.images.bottomImage
                    })
                    .attr("src", (d: ChicletSlicerDataPoint) => {
                        return d.imageURL ? d.imageURL : "";
                    });

                rowSelection.selectAll(ChicletSlicer.SlicerTextWrapperSelector.selectorName)
                    .style("height", (d: ChicletSlicerDataPoint): string => {
                        let height: number = ChicletSlicer.MaxImageSplit;
                        if (d.imageURL) {
                            height -= settings.images.imageSplit;
                        }
                        return `${height}%`;
                    })
                    .classed("hidden", (d: ChicletSlicerDataPoint) => {
                        if (settings.images.imageSplit > ChicletSlicer.MaxImageSplitToHide) {
                            return true;
                        }
                    });

                rowSelection.selectAll(ChicletSlicer.ItemContainerSelector.selectorName).style({
                    "color": settings.slicerText.fontColor,
                    "border-style": ChicletSlicer.getBorderStyle(settings.slicerText.outline),
                    "border-color": settings.slicerText.outlineColor,
                    "border-width": ChicletSlicer.getBorderWidth(settings.slicerText.outline, settings.slicerText.outlineWeight),
                    "font-size": PixelConverter.fromPoint(+settings.slicerText.textSize),
                    "border-radius": ChicletSlicer.getBorderRadius(settings.slicerText.borderStyle),
                });

                if (settings.slicerText.background) {
                    let backgroundColor: string = hexToRGBString(
                        settings.slicerText.background,
                        (ChicletSlicer.MaxTransparency - settings.slicerText.transparency) / ChicletSlicer.MaxTransparency);

                    this.slicerBody.style("background-color", backgroundColor);
                }
                else {
                    this.slicerBody.style("background-color", null);
                }

                if (this.interactivityService && this.slicerBody) {
                    this.interactivityService.applySelectionStateToData(data.slicerDataPoints);

                    let slicerBody: Selection<any> = this.slicerBody.attr("width", this.currentViewport.width),
                        slicerItemContainers: Selection<any> = slicerBody.selectAll(ChicletSlicer.ItemContainerSelector.selectorName),
                        slicerItemLabels: Selection<any> = slicerBody.selectAll(ChicletSlicer.LabelTextSelector.selectorName),
                        slicerItemInputs: Selection<any> = slicerBody.selectAll(ChicletSlicer.InputSelector.selectorName),
                        slicerClear: Selection<any> = this.slicerHeader.select(ChicletSlicer.ClearSelector.selectorName);

                    let behaviorOptions: ChicletSlicerBehaviorOptions = {
                        dataPoints: data.slicerDataPoints,
                        slicerItemContainers: slicerItemContainers,
                        slicerItemLabels: slicerItemLabels,
                        slicerItemInputs: slicerItemInputs,
                        slicerClear: slicerClear,
                        interactivityService: this.interactivityService,
                        slicerSettings: data.slicerSettings,
                        isSelectionLoaded: this.isSelectionLoaded || data.hasHighlights,
                        identityFields: data.identityFields
                    };

                    this.interactivityService.bind(data.slicerDataPoints, this.behavior, behaviorOptions, {
                        hasSelectionOverride: data.hasSelectionOverride,
                    });

                    this.behavior.styleSlicerInputs(
                        rowSelection.select(ChicletSlicer.ItemContainerSelector.selectorName),
                        this.interactivityService.hasSelection());
                }
                else {
                    this.behavior.styleSlicerInputs(rowSelection.select(ChicletSlicer.ItemContainerSelector.selectorName), false);
                }
            }
        }

        private createSearchHeader(container: JQuery): void {
            let counter: number = 0;

            this.$searchHeader = $("<div>")
                .appendTo(container)
                .addClass("searchHeader")
                .addClass("collapsed");

            $("<div>").appendTo(this.$searchHeader)
                .attr("title", "Search")
                .addClass("search");

            this.$searchInput = $("<input>").appendTo(this.$searchHeader)
                .attr("type", "text")
                .attr("drag-resize-disabled", "true")
                .addClass("searchInput")
                .on("input", () => this.visualHost.persistProperties(<VisualObjectInstancesToPersist>{
                    merge: [{
                        objectName: "system",
                        selector: null,
                        properties: {
                            counter: counter++
                        }
                    }]
                }));
        }

        private updateSearchHeader(): void {
            this.$searchHeader.toggleClass("show", this.slicerData.slicerSettings.system.selfFilterEnabled);
            this.$searchHeader.toggleClass("collapsed", !this.slicerData.slicerSettings.system.selfFilterEnabled);
        }

        private getSearchHeaderHeight(): number {
            return this.$searchHeader && this.$searchHeader.hasClass("show")
                ? this.$searchHeader.height()
                : 0;
        }

        private getSlicerBodyViewport(currentViewport: IViewport): IViewport {
            let settings: ChicletSlicerSettings = this.settings,
                headerHeight: number = (settings.header.show) ? this.getHeaderHeight() : 0,
                searchHeight: number = (settings.system.selfFilterEnabled) ? this.getSearchHeaderHeight() : 0,
                borderHeight: number = settings.header.outlineWeight,
                height: number = currentViewport.height - (headerHeight + searchHeight + borderHeight + settings.header.borderBottomWidth),
                width: number = currentViewport.width - ChicletSlicer.WidthOfScrollbar;

            return {
                height: Math.max(height, ChicletSlicer.MinSizeOfViewport),
                width: Math.max(width, ChicletSlicer.MinSizeOfViewport)
            };
        }

        private updateSlicerBodyDimensions(): void {
            let slicerViewport: IViewport = this.getSlicerBodyViewport(this.currentViewport);
            this.slicerBody
                .style({
                    "height": PixelConverter.toString(slicerViewport.height),
                    "width": `${ChicletSlicer.MaxImageWidth}%`,
                });
        }

        private getHeaderHeight(): number {
            return textMeasurementService.estimateSvgTextHeight(
                ChicletSlicer.getChicletTextProperties(+this.settings.header.textSize));
        }

        private getRowHeight(): number {
            let textSettings = this.settings.slicerText;
            return textSettings.height !== 0
                ? textSettings.height
                : textMeasurementService.estimateSvgTextHeight(ChicletSlicer.getChicletTextProperties(+textSettings.textSize));
        }
        private parseSettings(dataView: DataView): ChicletSlicerSettings {
            return ChicletSlicerSettings.parse<ChicletSlicerSettings>(dataView);
        }

        private static getBorderStyle(outlineElement: string): string {
            return outlineElement === "0px" ? "none" : "solid";
        }

        public static getChicletTextProperties(textSize?: number): TextProperties {
            return {
                fontFamily: ChicletSlicer.DefaultFontFamily,
                fontSize: PixelConverter.fromPoint(textSize || ChicletSlicer.DefaultFontSizeInPt),
            };
        }

        private static getBorderWidth(outlineElement: string, outlineWeight: number): string {
            switch (outlineElement) {
                case "None":
                    return "0px";
                case "BottomOnly":
                    return "0px 0px " + outlineWeight + "px 0px";
                case "TopOnly":
                    return outlineWeight + "px 0px 0px 0px";
                case "TopBottom":
                    return outlineWeight + "px 0px " + outlineWeight + "px 0px";
                case "LeftRight":
                    return "0px " + outlineWeight + "px 0px " + outlineWeight + "px";
                case "Frame":
                    return outlineWeight + "px";
                default:
                    return outlineElement.replace("1", outlineWeight.toString());
            }
        }

        private static getBorderRadius(borderType: string): string {
            switch (borderType) {
                case ChicletBorderStyle.ROUNDED:
                    return "10px";
                case ChicletBorderStyle.SQUARE:
                    return "0px";
                default:
                    return "5px";
            }
        }
        public static validateSettings(settings: ChicletSlicerSettings): void {
            settings.header.outlineWeight = settings.header.outlineWeight < 0
                ? 0
                : settings.header.outlineWeight;

            settings.slicerText.outlineWeight = settings.slicerText.outlineWeight < 0
                ? 0
                : settings.slicerText.outlineWeight;

            settings.slicerText.padding = settings.slicerText.padding < 0
                ? 0
                : settings.slicerText.padding;

            settings.slicerText.height = settings.slicerText.height < 0
                ? 0
                : settings.slicerText.height;

            settings.slicerText.width = settings.slicerText.width < 0
                ? 0
                : settings.slicerText.width;

            settings.images.imageSplit = ChicletSlicer.getValidImageSplit(settings.images.imageSplit);

            settings.general.columns = settings.general.columns < 0
                ? 0
                : settings.general.columns;

            settings.general.columns = settings.general.columns > ChicletSlicer.MaxColumns
                ? ChicletSlicer.MaxColumns
                : settings.general.columns;

            settings.general.rows = settings.general.rows < 0
                ? 0
                : settings.general.rows;

            settings.general.rows = settings.general.rows > ChicletSlicer.MaxRows
                ? ChicletSlicer.MaxRows
                : settings.general.rows;
        }
    }

}
