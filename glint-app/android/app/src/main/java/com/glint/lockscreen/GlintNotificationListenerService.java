package com.glint.lockscreen;

import android.app.Notification;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.provider.Settings;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import java.time.Instant;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class GlintNotificationListenerService extends NotificationListenerService {
    private static final String PREFS = "glint_notification_signals";
    private static final String RECENT_KEY = "recent";
    private static final int MAX_RECENT = 12;

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        Notification notification = sbn.getNotification();
        if (notification == null) return;

        Bundle extras = notification.extras;
        CharSequence title = extras.getCharSequence(Notification.EXTRA_TITLE);
        CharSequence text = extras.getCharSequence(Notification.EXTRA_TEXT);
        if (title == null && text == null) return;

        JSONObject item = new JSONObject();
        try {
            item.put("app", sbn.getPackageName());
            item.put("title", title == null ? "" : title.toString());
            item.put("body", text == null ? "" : text.toString());
            item.put("receivedAt", Instant.ofEpochMilli(sbn.getPostTime()).toString());
            item.put("kind", inferKind(title, text));
        } catch (JSONException ignored) {
            return;
        }

        SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        JSONArray next = new JSONArray();
        next.put(item);

        try {
            JSONArray current = new JSONArray(prefs.getString(RECENT_KEY, "[]"));
            for (int i = 0; i < current.length() && next.length() < MAX_RECENT; i++) {
                next.put(current.getJSONObject(i));
            }
        } catch (JSONException ignored) {
            // Keep the newest item even if the old cache is malformed.
        }

        prefs.edit().putString(RECENT_KEY, next.toString()).apply();
    }

    private String inferKind(CharSequence title, CharSequence text) {
        String body = ((title == null ? "" : title.toString()) + " " + (text == null ? "" : text.toString())).toLowerCase();
        if (body.contains("航班") || body.contains("延误") || body.contains("登机口") || body.contains("flight") || body.contains("gate")) {
            return "flight_delay";
        }
        if (body.contains("快递") || body.contains("包裹") || body.contains("驿站") || body.contains("取件") || body.contains("delivery")) {
            return "delivery";
        }
        if (body.contains("暴雨") || body.contains("大风") || body.contains("降温") || body.contains("预警") || body.contains("weather")) {
            return "weather_alert";
        }
        if (body.contains("客户") || body.contains("老板") || body.contains("紧急") || body.contains("urgent")) {
            return "important_message";
        }
        return "";
    }

    public static boolean isEnabled(Context context) {
        String enabled = Settings.Secure.getString(context.getContentResolver(), "enabled_notification_listeners");
        return enabled != null && enabled.contains(context.getPackageName());
    }

    public static JSArray readRecent(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, MODE_PRIVATE);
        String raw = prefs.getString(RECENT_KEY, "[]");
        try {
            JSONArray parsed = new JSONArray(raw);
            JSArray out = new JSArray();
            for (int i = 0; i < parsed.length(); i++) {
                out.put(JSObject.fromJSONObject(parsed.getJSONObject(i)));
            }
            return out;
        } catch (JSONException ignored) {
            return new JSArray();
        }
    }
}
