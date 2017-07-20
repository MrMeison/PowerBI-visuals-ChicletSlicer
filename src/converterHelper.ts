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
    import converterHelper = powerbi.extensibility.utils.dataview.converterHelper;
    export class ChicletSlicerColumns<T> {
        public static getCategoricalValues(dataView: DataView): ChicletSlicerColumns<(DataViewValueColumn | DataViewCategoryColumn)[]> {
            let categorical: DataViewCategorical = dataView && dataView.categorical;
            let categories: DataViewCategoricalColumn[] = categorical && categorical.categories || [];
            let values: DataViewValueColumns = categorical && categorical.values || <DataViewValueColumns>[];
            let series: PrimitiveValue[] = categorical && values.source && this.getSeriesValues(dataView);
            return categorical && _.mapValues(new this<(DataViewValueColumn | DataViewCategoryColumn)[]>(),
                (n, i) =>
                    (<(DataViewValueColumn | DataViewCategoryColumn)[]>_.toArray(categories)).concat(_.toArray(values))
                        .filter((x: DataViewValueColumn | DataViewCategoryColumn) => x.source.roles && x.source.roles[i])
                        .map((x: DataViewValueColumn | DataViewCategoryColumn) => x.values)[0]
                    || values.source && values.source.roles && values.source.roles[i] && series);
        }
        public static getSeriesValues(dataView: DataView): PrimitiveValue[] {
            return dataView && dataView.categorical && dataView.categorical.values
                && dataView.categorical.values.map(x => converterHelper.getSeriesName(x.source));
        }

        public static getCategoryColumnByName(dataView: DataView, name: string): DataViewCategoryColumn {
            if (dataView && dataView.categorical && dataView.categorical.categories) {
                let categories: DataViewCategoryColumn[] = dataView.categorical.categories.filter(x => x.source.roles[name]);
                if (categories && categories.length) {
                    return categories[0];
                }
            }
        }
        public Category: T = null;
        public Values: T = null;
        public Image: T = null;
        public URL: T = null;
    }
}
