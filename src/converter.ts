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
    // powerbi.data
    import ISQExpr = powerbi.data.ISQExpr;
    import SemanticFilter = powerbi.data.ISemanticFilter;

    // powerbi.extensibility.utils.formatting
    import valueFormatter = powerbi.extensibility.utils.formatting.valueFormatter;

    // powerbi.extensibility.utils.dataview
    import DataViewObjectsModule = powerbi.extensibility.utils.dataview.DataViewObjects;

    export class ChicletSlicerConverter {
        private dataViewCategorical: DataViewCategorical;
        private dataViewMetadata: DataViewMetadata;
        private category: DataViewCategoryColumn;
        public identityFields: ISQExpr[];
        public numberOfCategoriesSelectedInData: number;
        public dataPoints: ChicletSlicerDataPoint[];
        public hasHighlights: boolean;
        private host: IVisualHost;
        public hasSelectionOverride: boolean;
        private static selectedPropertyIdentifier: DataViewObjectPropertyIdentifier = { objectName: "system", propertyName: "selected" };
        private data: ChicletSlicerColumns<any>;

        public constructor(dataView: DataView, host: IVisualHost) {
            const dataViewCategorical: DataViewCategorical = dataView.categorical;
            this.category = ChicletSlicerColumns.getCategoryColumnByName(dataView, "Category");
            this.dataViewCategorical = dataViewCategorical;
            this.dataViewMetadata = dataView.metadata;
            this.host = host;

            if (dataViewCategorical.categories && dataViewCategorical.categories.length > 0) {
                this.data = ChicletSlicerColumns.getCategoricalValues(dataView);
            }

            this.dataPoints = [];

            this.hasSelectionOverride = false;
        }

        private isCategoryColumnSelected(propertyId: DataViewObjectPropertyIdentifier, categories: DataViewCategoricalColumn, idx: number): boolean {
            return categories.objects != null
                && categories.objects[idx]
                && DataViewObjectsModule.getValue<boolean>(categories.objects[idx], propertyId);
        }

        public convert(): void {
            this.dataPoints = [];
            this.numberOfCategoriesSelectedInData = 0;
            const categoryValues = this.data.Category;
            // If category exists, we render labels using category values. If not, we render labels
            // using measure labels.
            if (categoryValues) {
                let objects = this.dataViewMetadata ? <any>this.dataViewMetadata.objects : undefined;

                let isInvertedSelectionMode: boolean = false;
                let numberOfScopeIds: number;

                if (objects && objects.general && objects.general.filter) {
                    if (!this.identityFields) {
                        return;
                    }
                    let filter: SemanticFilter = <SemanticFilter>objects.general.filter;
                }

                let hasSelection: boolean = undefined;

                if (this.dataViewCategorical.values) {
                    for (let idx: number = 0; idx < categoryValues.length; idx++) {
                        let selected = this.isCategoryColumnSelected(ChicletSlicerConverter.selectedPropertyIdentifier, this.category, idx);
                        if (selected != null) {
                            hasSelection = selected;
                            break;
                        }
                    }
                }

                let dataViewCategorical = this.dataViewCategorical,
                    value: number = -Infinity;

                this.hasHighlights = false;

                for (let categoryIndex: number = 0, categoryCount = categoryValues.length; categoryIndex < categoryCount; categoryIndex++) {
                    let categoryIsSelected: boolean = this.isCategoryColumnSelected(
                        ChicletSlicerConverter.selectedPropertyIdentifier,
                        this.category,
                        categoryIndex);

                    let selectable: boolean = true;

                    if (hasSelection != null) {
                        if (isInvertedSelectionMode) {
                            if (this.category.objects == null)
                                categoryIsSelected = undefined;

                            if (categoryIsSelected != null) {
                                categoryIsSelected = hasSelection;
                            } else if (categoryIsSelected == null) {
                                categoryIsSelected = !hasSelection;
                            }
                        } else {
                            if (categoryIsSelected == null) {
                                categoryIsSelected = !hasSelection;
                            }
                        }
                    }

                    if (categoryIsSelected) {
                        this.numberOfCategoriesSelectedInData++;
                    }

                    let categorySelectionId: ISelectionId = this.host.createSelectionIdBuilder()
                        .withCategory(this.category, categoryIndex)
                        .createSelectionId();

                    this.dataPoints.push({
                        identity: categorySelectionId as powerbi.visuals.ISelectionId,
                        category: this.data.Category[categoryIndex],
                        imageURL: this.data.Image[categoryIndex],
                        value: this.data.Values[categoryIndex],
                        url: this.data.URL[categoryIndex],
                        selected: false,
                        selectable: selectable
                    });
                }

                if (numberOfScopeIds != null && numberOfScopeIds > this.numberOfCategoriesSelectedInData) {
                    this.hasSelectionOverride = true;
                }
            }
        }
    }
}
