using System;
using System.Diagnostics;
using System.Runtime.InteropServices;

class Program
{
    [DllImport("UIAutomationCore.dll")]
    static extern int UiaClientsAreListening();

    static void Main(string[] args)
    {
        if (args.Length == 0 || !int.TryParse(args[0], out int pid))
        {
            Environment.Exit(1);
            return;
        }

        try
        {
            var process = Process.GetProcessById(pid);
            var handle = process.MainWindowHandle;
            if (handle == IntPtr.Zero) { Environment.Exit(1); return; }

            // Create UI Automation object
            Type uiAutomationType = Type.GetTypeFromCLSID(new Guid("ff48dba4-60ef-4201-aa87-54103eef594e"));
            dynamic automation = Activator.CreateInstance(uiAutomationType);
            
            dynamic element = automation.ElementFromHandle(handle);
            if (element == null) { Environment.Exit(1); return; }

            // Find Edit control (address bar) - ControlType = 50004 (Edit)
            dynamic condition = automation.CreatePropertyCondition(30003, 50004);
            dynamic addressBar = element.FindFirst(4, condition); // 4 = TreeScope_Descendants

            if (addressBar != null)
            {
                try
                {
                    // Get Value pattern (ID = 10002)
                    dynamic valuePattern = addressBar.GetCurrentPattern(10002);
                    string url = valuePattern.CurrentValue;
                    
                    if (!string.IsNullOrWhiteSpace(url) && 
                        (url.StartsWith("http://") || url.StartsWith("https://") || url.StartsWith("www.")))
                    {
                        Console.WriteLine(url);
                        Environment.Exit(0);
                        return;
                    }
                }
                catch { }
            }
        }
        catch { }
        Environment.Exit(1);
    }
}
