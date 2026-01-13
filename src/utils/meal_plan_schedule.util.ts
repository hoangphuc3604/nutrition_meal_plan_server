export interface MealPlanScheduleEntry {
  dayAbbrev: string;
  daysToGenerate: number;
  cronDayOfWeek: number;
}

export interface ParsedMealPlanSchedule {
  entries: MealPlanScheduleEntry[];
  hour: number;
  minute: number;
  timezone: string;
}

const DAY_ABBREV_TO_CRON_DOW: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export class MealPlanScheduleParser {
  static parse(scheduleString: string): ParsedMealPlanSchedule {
    if (!scheduleString || scheduleString.trim() === '') {
      throw new Error('MEAL_PLAN_SCHEDULE cannot be empty');
    }

    const parts = scheduleString.split('|');
    if (parts.length !== 3) {
      throw new Error('MEAL_PLAN_SCHEDULE must have format: "DayMap|HH:MM|TimeZone"');
    }

    const [dayMapStr, timeStr, timezone] = parts;

    const entries = this.parseDayMap(dayMapStr.trim());
    const { hour, minute } = this.parseTime(timeStr.trim());

    return {
      entries,
      hour,
      minute,
      timezone: timezone.trim(),
    };
  }

  private static parseDayMap(dayMapStr: string): MealPlanScheduleEntry[] {
    const entries: MealPlanScheduleEntry[] = [];

    const dayPairs = dayMapStr.split(',');
    for (const pair of dayPairs) {
      const trimmedPair = pair.trim();
      const colonIndex = trimmedPair.indexOf(':');
      if (colonIndex === -1) {
        throw new Error(`Invalid day pair format: "${trimmedPair}". Expected "DayAbbrev:daysToGen"`);
      }

      const dayAbbrev = trimmedPair.substring(0, colonIndex).trim();
      const daysStr = trimmedPair.substring(colonIndex + 1).trim();

      if (!DAY_ABBREV_TO_CRON_DOW.hasOwnProperty(dayAbbrev)) {
        throw new Error(`Invalid day abbreviation: "${dayAbbrev}". Must be one of: ${Object.keys(DAY_ABBREV_TO_CRON_DOW).join(', ')}`);
      }

      const daysToGenerate = parseInt(daysStr, 10);
      if (isNaN(daysToGenerate) || daysToGenerate < 1 || daysToGenerate > 7) {
        throw new Error(`Invalid days to generate: "${daysStr}". Must be a number between 1 and 7`);
      }

      entries.push({
        dayAbbrev,
        daysToGenerate,
        cronDayOfWeek: DAY_ABBREV_TO_CRON_DOW[dayAbbrev],
      });
    }

    if (entries.length === 0) {
      throw new Error('At least one day pair must be specified');
    }

    return entries;
  }

  private static parseTime(timeStr: string): { hour: number; minute: number } {
    const timeParts = timeStr.split(':');
    if (timeParts.length !== 2) {
      throw new Error(`Invalid time format: "${timeStr}". Expected "HH:MM"`);
    }

    const hour = parseInt(timeParts[0], 10);
    const minute = parseInt(timeParts[1], 10);

    if (isNaN(hour) || hour < 0 || hour > 23) {
      throw new Error(`Invalid hour: "${timeParts[0]}". Must be between 0 and 23`);
    }

    if (isNaN(minute) || minute < 0 || minute > 59) {
      throw new Error(`Invalid minute: "${timeParts[1]}". Must be between 0 and 59`);
    }

    return { hour, minute };
  }

  static validateScheduleString(scheduleString: string): boolean {
    try {
      this.parse(scheduleString);
      return true;
    } catch {
      return false;
    }
  }
}





