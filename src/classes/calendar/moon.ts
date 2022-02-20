import Year from "./year";
import {Icons, MoonYearResetOptions} from "../../constants";
import {Logger} from "../logging";
import {GameSettings} from "../foundry-interfacing/game-settings";
import ConfigurationItemBase from "../configuration/configuration-item-base";

/**
 * Class for representing a moon
 */
export default class Moon extends ConfigurationItemBase{
    /**
     * How long in calendar days the moon takes to do 1 revolution
     * @type {number}
     */
    cycleLength: number;
    /**
     * The different phases of the moon
     * @type {Array<MoonPhase>}
     */
    phases: SimpleCalendar.MoonPhase[] = [];
    /**
     * When the first new moon took place. Used as a reference for calculating the position of the current cycle
     */
    firstNewMoon: SimpleCalendar.FirstNewMoonDate = {
        /**
         * The year reset options for the first new moon
         * @type {number}
         */
        yearReset: MoonYearResetOptions.None,
        /**
         * How often the year should reset
         * @type {number}
         */
        yearX: 0,
        /**
         * The year of the first new moon
         * @type {number}
         */
        year: 0,
        /**
         * The month of the first new moon
         * @type {number}
         */
        month: 1,
        /**
         * The day of the first new moon
         * @type {number}
         */
        day: 1
    };
    /**
     * A color to associate with the moon when displaying it on the calendar
     */
    color: string = '#ffffff';
    /**
     * The amount of days to adjust the current cycle day by
     * @type {number}
     */
    cycleDayAdjust: number = 0;

    /**
     * The moon constructor
     * @param {string} name The name of the moon
     * @param {number} cycleLength The length of the moons cycle
     */
    constructor(name: string = '', cycleLength: number = 0) {
        super(name);
        this.cycleLength = cycleLength;

        this.phases.push({
            name: GameSettings.Localize('FSC.Moon.Phase.New'),
            length: 3.69,
            icon: Icons.NewMoon,
            singleDay: true
        });
    }

    /**
     * Creates a clone of this moon object
     * @return {Moon}
     */
    clone(): Moon {
        const c = new Moon(this.name, this.cycleLength);
        c.id = this.id;
        c.phases = this.phases.map(p => { return { name: p.name, length: p.length, icon: p.icon, singleDay: p.singleDay };});
        c.firstNewMoon.yearReset = this.firstNewMoon.yearReset;
        c.firstNewMoon.yearX = this.firstNewMoon.yearX;
        c.firstNewMoon.year = this.firstNewMoon.year;
        c.firstNewMoon.month = this.firstNewMoon.month;
        c.firstNewMoon.day = this.firstNewMoon.day;
        c.color = this.color;
        c.cycleDayAdjust = this.cycleDayAdjust;
        return c;
    }

    /**
     * Returns the configuration for the moon
     */
    toConfig(): SimpleCalendar.MoonData {
        return {
            id: this.id,
            name: this.name,
            cycleLength: this.cycleLength,
            firstNewMoon: {yearReset: this.firstNewMoon.yearReset, yearX: this.firstNewMoon.yearX, year: this.firstNewMoon.year, month: this.firstNewMoon.month, day: this.firstNewMoon.day, },
            phases: this.phases.map(p => { return { name: p.name, length: p.length, icon: p.icon, singleDay: p.singleDay };}),
            color: this.color,
            cycleDayAdjust: this.cycleDayAdjust
        };
    }

    /**
     * Converts this moon into a template used for displaying the moon in HTML
     * @param {Year} year The year to use for getting the days and months
     */
    toTemplate(year: Year): SimpleCalendar.HandlebarTemplateData.Moon {
        const data: SimpleCalendar.HandlebarTemplateData.Moon = {
            ...super.toTemplate(),
            name: this.name,
            cycleLength: this.cycleLength,
            firstNewMoon: this.firstNewMoon,
            phases: this.phases,
            color: this.color,
            cycleDayAdjust: this.cycleDayAdjust,
            dayList: []
        };

        const month = year.months.find(m => m.numericRepresentation === data.firstNewMoon.month);

        if(month){
            data.dayList = month.days.map(d => d.toTemplate());
        }

        return data;
    }

    /**
     * Loads the moon data from the config object.
     * @param {MoonData} config The configuration object for this class
     */
    loadFromSettings(config: SimpleCalendar.MoonData) {
        if(config && Object.keys(config).length){
            if(config.hasOwnProperty('id')){
                this.id = config.id;
            }
            this.name = config.name;
            this.cycleLength = config.cycleLength;
            this.phases = config.phases;
            this.firstNewMoon = {
                yearReset: config.firstNewMoon.yearReset,
                yearX: config.firstNewMoon.yearX,
                year: config.firstNewMoon.year,
                month: config.firstNewMoon.month,
                day: config.firstNewMoon.day
            };
            this.color = config.color;
            this.cycleDayAdjust = config.cycleDayAdjust;
        }
    }

    /**
     * Updates each phases length in days so the total length of all phases matches the cycle length
     */
    updatePhaseLength(){
        let pLength = 0, singleDays = 0;
        for(let i = 0; i < this.phases.length; i++){
            if(this.phases[i].singleDay){
               singleDays++;
            } else {
                pLength++;
            }
        }
        const phaseLength = Number(((this.cycleLength - singleDays) / pLength).toPrecision(6));

        this.phases.forEach(p => {
            if(p.singleDay){
                p.length = 1;
            } else {
                p.length = phaseLength;
            }
        });
    }

    /**
     * Returns the current phase of the moon based on a year month and day.
     * This phase will be within + or - 1 days of when the phase actually begins
     * @param {Year} year The year class to get the information from
     * @param {number} yearNum The year to use
     * @param {number} monthIndex The month to use
     * @param {number} dayIndex The day to use
     */
    getDateMoonPhase(year: Year, yearNum: number, monthIndex: number, dayIndex: number): SimpleCalendar.MoonPhase{
        let firstNewMoonDays = year.dateToDays(this.firstNewMoon.year, this.firstNewMoon.month, this.firstNewMoon.day, true, true);
        let resetYearAdjustment = 0;
        if(this.firstNewMoon.yearReset === MoonYearResetOptions.LeapYear){
            let lyYear = year.leapYearRule.previousLeapYear(yearNum);
            if(lyYear !== null){
                Logger.debug(`Resetting moon calculation first day to year: ${lyYear}`);
                firstNewMoonDays = year.dateToDays(lyYear, this.firstNewMoon.month, this.firstNewMoon.day, true, true);
                if(yearNum !== lyYear){
                    resetYearAdjustment += year.leapYearRule.fraction(yearNum);
                }
            }
        } else if(this.firstNewMoon.yearReset === MoonYearResetOptions.XYears){
            const resetMod = yearNum % this.firstNewMoon.yearX;
            if(resetMod !== 0){
                let resetYear = yearNum - resetMod;
                firstNewMoonDays = year.dateToDays(resetYear, this.firstNewMoon.month, this.firstNewMoon.day, true, true);
                resetYearAdjustment += resetMod / this.firstNewMoon.yearX;
            }
        }

        const daysSoFar = year.dateToDays(yearNum, monthIndex, dayIndex, true, true);
        const daysSinceReferenceMoon = daysSoFar - firstNewMoonDays + resetYearAdjustment;
        const moonCycles = daysSinceReferenceMoon / this.cycleLength;
        let daysIntoCycle = ((moonCycles - Math.floor(moonCycles)) * this.cycleLength) + this.cycleDayAdjust;

        let phaseDays = 0;
        let phase: SimpleCalendar.MoonPhase | null = null;
        for(let i = 0; i < this.phases.length; i++){
            const newPhaseDays = phaseDays + this.phases[i].length;
            if(daysIntoCycle >= phaseDays && daysIntoCycle < newPhaseDays){
                phase = this.phases[i];
                break;
            }
            phaseDays = newPhaseDays;
        }
        if(phase !== null){
            return phase;
        }else {
            return this.phases[0];
        }
    }

    /**
     * Gets the moon phase based on the current, selected or visible date
     * @param {Year} year The year class used to get the year, month and day to use
     * @param {string} property Which property to use when getting the year, month and day. Can be current, selected or visible
     * @param {DayTemplate|null} [dayToUse=null] The day to use instead of the day associated with the property
     */
    getMoonPhase(year: Year, property = 'current', dayToUse: SimpleCalendar.HandlebarTemplateData.Day | null = null): SimpleCalendar.MoonPhase{
        property = property.toLowerCase() as 'current' | 'selected' | 'visible';
        let yearNum = property === 'current'? year.numericRepresentation : property === 'selected'? year.selectedYear : year.visibleYear;
        const month = year.getMonth(property);
        if(month){
            const day = property !== 'visible'? month.getDay(property) : dayToUse;
            let monthNum = month.numericRepresentation;
            let dayNum = day? day.numericRepresentation : 1;
            return this.getDateMoonPhase(year, yearNum, monthNum, dayNum);
        }
        return this.phases[0];
    }

}
