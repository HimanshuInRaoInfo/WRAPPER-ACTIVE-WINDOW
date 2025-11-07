using System;
using System.Diagnostics;
using System.Linq;
using System.Threading;
using System.Windows.Automation;

namespace BrowserAutomation
{
    public static class BrowserAddressBarReader
    {
        /// <summary>
        /// Attempts to read the browser address bar (URL) text for a Chromium-based browser window owned by the given process id (PID).
        /// Returns the found URL string or null if none found within the timeout.
        /// </summary>
        public static string? GetBrowserAddressBarUrl(int pid, TimeSpan? timeout = null)
        {
            if (timeout == null) timeout = TimeSpan.FromSeconds(3);
            var deadline = DateTime.UtcNow + timeout.Value;
            var root = AutomationElement.RootElement;
            if (root == null) throw new InvalidOperationException("UI Automation root element not available.");

            string? ExtractText(AutomationElement el)
            {
                try
                {
                    if (el.TryGetCurrentPattern(ValuePattern.Pattern, out object? vpObj) && vpObj is ValuePattern vp)
                    {
                        var val = vp.Current.Value;
                        if (!string.IsNullOrWhiteSpace(val)) return val;
                    }

                    if (el.TryGetCurrentPattern(TextPattern.Pattern, out object? tpObj) && tpObj is TextPattern tp)
                    {
                        var text = tp.DocumentRange.GetText(-1);
                        if (!string.IsNullOrWhiteSpace(text)) return text;
                    }
                }
                catch
                {
                    // ignore pattern retrieval errors for this element
                }

                return null;
            }

            string[] nameKeywords = new[]
            {
                "address and search",
                "omnibox",
                "address",
                "url",
                "search or enter web address",
                "search"
            };

            while (DateTime.UtcNow < deadline)
            {
                try
                {
                    var topChildren = root.FindAll(TreeScope.Children, Condition.TrueCondition)
                        .Cast<AutomationElement>()
                        .Where(e =>
                        {
                            try { return e.Current.ProcessId == pid && e.Current.ControlType == ControlType.Window; }
                            catch { return false; }
                        })
                        .ToArray();

                    foreach (var win in topChildren)
                    {
                        var edits = win.FindAll(TreeScope.Descendants,
                            new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.Edit))
                            .Cast<AutomationElement>()
                            .Where(e =>
                            {
                                try
                                {
                                    var name = e.Current.Name ?? string.Empty;
                                    var aid = e.Current.AutomationId ?? string.Empty;
                                    var cname = e.Current.ClassName ?? string.Empty;
                                    var combined = (name + " " + aid + " " + cname).ToLowerInvariant();
                                    return nameKeywords.Any(k => combined.Contains(k));
                                }
                                catch { return false; }
                            })
                            .ToArray();

                        if (!edits.Any())
                        {
                            edits = win.FindAll(TreeScope.Descendants,
                                new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.Edit))
                                .Cast<AutomationElement>()
                                .Where(e =>
                                {
                                    try
                                    {
                                        return !e.Current.IsOffscreen && e.Current.IsEnabled;
                                    }
                                    catch { return false; }
                                })
                                .ToArray();
                        }

                        foreach (var edit in edits)
                        {
                            var text = ExtractText(edit);
                            if (!string.IsNullOrWhiteSpace(text))
                            {
                                var trimmed = text.Trim();
                                if (trimmed.Length > 3 && (trimmed.StartsWith("http", StringComparison.OrdinalIgnoreCase) || trimmed.Contains(".")))
                                    return trimmed;
                                return trimmed;
                            }

                            try
                            {
                                edit.SetFocus();
                                Thread.Sleep(80);
                                var text2 = ExtractText(edit);
                                if (!string.IsNullOrWhiteSpace(text2)) return text2.Trim();
                            }
                            catch { }
                        }

                        var candidates = win.FindAll(TreeScope.Descendants, Condition.TrueCondition)
                            .Cast<AutomationElement>()
                            .Where(e =>
                            {
                                try
                                {
                                    var name = e.Current.Name ?? string.Empty;
                                    var combined = name.ToLowerInvariant();
                                    return nameKeywords.Any(k => combined.Contains(k))
                                           && e.TryGetCurrentPattern(ValuePattern.Pattern, out _);
                                }
                                catch { return false; }
                            })
                            .ToArray();

                        foreach (var cand in candidates)
                        {
                            var text = ExtractText(cand);
                            if (!string.IsNullOrWhiteSpace(text)) return text.Trim();
                        }
                    }
                }
                catch
                {
                    // ignore and retry until timeout
                }

                Thread.Sleep(150);
            }

            return null;
        }
    }
}
