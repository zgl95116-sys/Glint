package com.glint.lockscreen;

import android.Manifest;
import android.content.ContentUris;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.provider.CalendarContract;
import android.provider.Settings;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import java.time.Instant;

@CapacitorPlugin(
    name = "GlintContext",
    permissions = {
        @Permission(alias = "calendar", strings = { Manifest.permission.READ_CALENDAR })
    }
)
public class GlintContextPlugin extends Plugin {
    private static final long LOOKAHEAD_MS = 6L * 60L * 60L * 1000L;
    private static final int MAX_CALENDAR_ITEMS = 5;

    @PluginMethod
    public void getSnapshot(PluginCall call) {
        Context context = getContext();
        boolean calendarGranted = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.READ_CALENDAR
        ) == PackageManager.PERMISSION_GRANTED;

        JSObject result = new JSObject();
        result.put("calendarPermission", calendarGranted ? "granted" : "denied");
        result.put("notificationAccess", GlintNotificationListenerService.isEnabled(context) ? "granted" : "denied");
        result.put("upcomingCalendar", calendarGranted ? readUpcomingCalendar(context) : new JSArray());
        result.put("notifications", GlintNotificationListenerService.readRecent(context));
        call.resolve(result);
    }

    @PluginMethod
    public void openNotificationSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
        getActivity().startActivity(intent);
        call.resolve();
    }

    private JSArray readUpcomingCalendar(Context context) {
        JSArray events = new JSArray();
        long now = System.currentTimeMillis();
        Uri.Builder builder = CalendarContract.Instances.CONTENT_URI.buildUpon();
        ContentUris.appendId(builder, now);
        ContentUris.appendId(builder, now + LOOKAHEAD_MS);

        String[] projection = new String[] {
            CalendarContract.Instances.TITLE,
            CalendarContract.Instances.BEGIN,
            CalendarContract.Instances.EVENT_LOCATION
        };

        try (Cursor cursor = context.getContentResolver().query(
            builder.build(),
            projection,
            null,
            null,
            CalendarContract.Instances.BEGIN + " ASC"
        )) {
            if (cursor == null) return events;

            int count = 0;
            while (cursor.moveToNext() && count < MAX_CALENDAR_ITEMS) {
                String title = cursor.getString(0);
                long beginsAt = cursor.getLong(1);
                String location = cursor.getString(2);
                if (title == null || title.trim().isEmpty()) continue;

                JSObject item = new JSObject();
                item.put("title", title);
                item.put("startsAt", Instant.ofEpochMilli(beginsAt).toString());
                if (location != null && !location.trim().isEmpty()) {
                    item.put("location", location);
                }
                events.put(item);
                count++;
            }
        } catch (SecurityException ignored) {
            return new JSArray();
        }

        return events;
    }
}
