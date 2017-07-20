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
    // powerbi.extensibility.utils.dataview
    import DataViewObjectsParser = powerbi.extensibility.utils.dataview.DataViewObjectsParser;

    // powerbi.data
    import ISemanticFilter = powerbi.data.ISemanticFilter;

    export class ChicletSlicerSettings extends DataViewObjectsParser {
        general: GeneralSettings = new GeneralSettings();
        system: SystemSettings = new SystemSettings();
        header: HeaderSettings = new HeaderSettings();
        headerText: HeaderTextSettings = new HeaderTextSettings();
        slicerText: SlicerTextSettings = new SlicerTextSettings();
        slicerItemContainer: SlicerItemContainerSettings = new SlicerItemContainerSettings();
        images: ImagesSettings = new ImagesSettings();
    }

    export class GeneralSettings {
        orientation: string = Orientation.VERTICAL;
        columns: number = 3;
        rows: number = 0;
        multiselect: boolean = true;
        forcedSelection: boolean = false;
        showDisabled: string = ChicletSlicerShowDisabled.INPLACE;
    }

    export class SystemSettings {
        selection: string = null;
        filter: string = null;
        selected: boolean = false;
        selfFilterEnabled: boolean = false;
        selfFilter: string = null;
        formatString: string = null;
        public getSavedSelection(): string[] {
            try {
                return JSON.parse(this.selection) || [];
            } catch (ex) {
                return [];
            }
        }

        setSavedSelection: (filter: ISemanticFilter, selectionIds: string[]) => void;
    }

    export class HeaderSettings {
        show: boolean = true;
        title: string = "";
        fontColor: string = "#a6a6a6";
        background: string = null;
        textSize: string = "10";
        outline: string = "BottomOnly";
        outlineColor: string = "#a6a6a6";
        outlineWeight: number = 1;
        borderBottomWidth: number = 1;
    }

    export class HeaderTextSettings {
        marginLeft: number = 5;
        marginTop: number = 0;
    }

    export class SlicerTextSettings {
        textSize: string = "10";
        height: number = 0;
        width: number = 0;
        selectedColor: string = "#BDD7EE";
        hoverColor: string = "#212121";
        unselectedColor: string = "#FFFFFF";
        disabledColor: string = "#808080";
        background: string = null;
        transparency: number = 0;
        fontColor: string = "#666666";
        outline: string = "Frame";
        outlineColor: string = "#000000";
        outlineWeight: number = 1;
        padding: number = 3;
        borderStyle: string = "Cut";
    }

    export class SlicerItemContainerSettings {
        marginLeft: number = 0;
    }

    export class ImagesSettings {
        clickableImage: boolean = false;
        imageSplit: number = 50;
        stretchImage: boolean = false;
        bottomImage: boolean = false;
    }
}
