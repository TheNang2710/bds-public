import pandas as pd
import matplotlib.pyplot as plt
import argparse
import sys
import os
import glob

# Set pandas options to avoid truncation
pd.set_option('display.max_rows', None)
pd.set_option('display.max_columns', None)
pd.set_option('display.width', 1000)
pd.set_option('display.float_format', '{:,.2f}'.format)

def find_latest_file(directory, extension=".csv"):
    list_of_files = glob.glob(f'{directory}/*{extension}')
    if not list_of_files:
        print(f"No files with extension {extension} found in {directory}")
        sys.exit(1)

    latest_file = max(list_of_files, key=os.path.getctime)
    return latest_file

def load_watch_list(file_path):
    try:
        with open(file_path, 'r') as file:
            emails = [line.strip() for line in file.readlines()]
        return emails
    except FileNotFoundError:
        print(f"Error: The file {file_path} does not exist.")
        sys.exit(1)

def summarize_usage(api_df, ws_df, overage_df=None, start_rank=None, end_rank=None):
    # Summarize API usage
    api_summary = api_df.groupby('email')['usage'].sum().reset_index().rename(columns={'usage': 'API Usage'})
    ws_summary = ws_df.groupby('email')['cus'].sum().reset_index().rename(columns={'cus': 'WS Usage'})

    # Merge API and WebSocket usage summaries
    summary = pd.merge(api_summary, ws_summary, on='email', how='outer').fillna(0)

    # Calculate total usage
    summary['Total Usage'] = summary['API Usage'] + summary['WS Usage']

    # Sort by total usage unless overage_df is present
    if overage_df is not None:
        summary = pd.merge(summary, overage_df[['email', 'overage', 'overageCost']], on='email', how='left').fillna(0)
        summary = summary[summary['overage'] > 0]  # Only show emails with overage > 0
        summary = summary.sort_values(by='overage', ascending=False)
    else:
        summary = summary.sort_values(by='Total Usage', ascending=False)

    # Apply ranking based on start and end rank parameters
    if start_rank is None:
        start_rank = 0
    if end_rank is None or end_rank > len(summary):
        end_rank = len(summary)

    summary = summary.iloc[start_rank:end_rank].reset_index(drop=True)  # Reset index for consistent numbering
    return summary

def show_details(api_df, ws_df, email):
    print(f"\nDetailed usage for {email}:")

    # API endpoint usage
    api_usage = api_df[api_df['email'] == email].copy()
    total_api_usage = api_usage['usage'].sum()
    if not api_usage.empty:
        api_usage_summary = api_usage.groupby('endpoint')['usage'].sum().reset_index().sort_values(by='usage', ascending=False)
        api_usage_summary['usage'] = api_usage_summary['usage'].map('{:,.0f}'.format)
        print(f"\nAPI Total: {total_api_usage:,.0f}")
        print("\nAPI Usage by Endpoint:")
        print(api_usage_summary.to_string(index=False))
    else:
        print("\nNo API usage data available for this email.")

    # WebSocket usage
    ws_usage = ws_df[ws_df['email'] == email].copy()
    total_ws_usage = ws_usage['cus'].sum()
    if not ws_usage.empty:
        ws_usage_summary = ws_usage.groupby('type')['cus'].sum().reset_index().sort_values(by='cus', ascending=False)
        ws_usage_summary['cus'] = ws_usage_summary['cus'].map('{:,.2f}'.format)
        print(f"\nWS Total: {total_ws_usage:,.0f}")
        print("\nWebSocket Usage by Type:")
        print(ws_usage_summary.to_string(index=False))

        # Plot WebSocket usage by type
        plt.figure(figsize=(10, 6))
        for ws_type in ws_usage_summary['type'].unique():
            ws_type_usage = ws_df.loc[(ws_df['email'] == email) & (ws_df['type'] == ws_type), :].copy()
            ws_type_usage['date'] = pd.to_datetime(ws_type_usage['date'])  # Use .loc[] to avoid SettingWithCopyWarning
            ws_type_usage_summary = ws_type_usage.groupby('date')['cus'].sum()
            plt.plot(ws_type_usage_summary.index, ws_type_usage_summary.values, label=f'{ws_type}')

            # Prepare the text for annotation
            summary_text = f"{ws_type}: {ws_usage_summary[ws_usage_summary['type'] == ws_type]['cus'].values[0]} CUs"
            plt.gcf().text(0.02, 0.02 + 0.03 * ws_usage_summary['type'].tolist().index(ws_type), summary_text, fontsize=9, color='black')

        plt.title(f'WebSocket Usage for {email}')
        plt.xlabel('Date')
        plt.ylabel('WS Usage')
        plt.legend()
        plt.grid(True)
        plt.show()
    else:
        print("\nNo WebSocket usage data available for this email.")

    # Show total combined usage
    print(f"\nTotal Usage for {email}: {total_api_usage + total_ws_usage:,.0f}")

def print_table_with_usage(df, show_overage=False):
    if show_overage:
        print(f"\n{'No':<5}{'Email':<40}{'API Usage':>20}{'WS Usage':>20}{'Total Usage':>20}{'Overage':>20}{'OverageCost':>20}")
        print("="*145)
        for i, row in df.iterrows():
            print(f"{i + 1:<5}{row['email']:<40}{row['API Usage']:>20,.0f}{row['WS Usage']:>20,.0f}{row['Total Usage']:>20,.0f}{row['overage']:>20,.0f}{row['overageCost']:>20,.2f}")
        print("="*145)
    else:
        print(f"\n{'No':<5}{'Email':<40}{'API Usage':>20}{'WS Usage':>20}{'Total Usage':>20}")
        print("="*90)
        for i, row in df.iterrows():
            print(f"{i + 1:<5}{row['email']:<40}{row['API Usage']:>20,.0f}{row['WS Usage']:>20,.0f}{row['Total Usage']:>20,.0f}")
        print("="*90)

def main():
    parser = argparse.ArgumentParser(description='Process API, WebSocket, and Overage usage data.')
    parser.add_argument('--s', type=int, help='Start rank for range query')
    parser.add_argument('--e', type=int, help='End rank for range query')
    parser.add_argument('--f', type=int, default=0, help='Filter to show emails with total usage >= this value (in millions)')
    parser.add_argument('--m', type=str, help='Search for an email containing the given string')
    parser.add_argument('--o', action='store_true', help='Find overage details')
    parser.add_argument('--w', action='store_true', help='Show usage for emails in watch-list.txt')
    parser.add_argument('emails', nargs='*', type=str, help='User emails to filter data (optional)')

    args = parser.parse_args()

    # Directories containing the CSV files
    api_directory = "../usage_per_endpoint"
    ws_directory = "../usage_per_ws"
    overage_directory = "../usage_per_paid_user"

    # Find the latest API and WS files
    api_file = find_latest_file(api_directory)
    ws_file = find_latest_file(ws_directory)

    # Load the CSV files
    api_df = pd.read_csv(api_file)
    ws_df = pd.read_csv(ws_file)

    # Ensure columns are numeric
    api_df['usage'] = pd.to_numeric(api_df['usage'], errors='coerce').fillna(0)
    ws_df['cus'] = pd.to_numeric(ws_df['cus'], errors='coerce').fillna(0)

    overage_df = None
    if args.o:
        overage_file = find_latest_file(overage_directory)
        overage_df = pd.read_csv(overage_file)
        overage_df['usage'] = pd.to_numeric(overage_df['usage'], errors='coerce').fillna(0)
        overage_df['overage'] = pd.to_numeric(overage_df['overage'], errors='coerce').fillna(0)
        overage_df['overageCost'] = pd.to_numeric(overage_df['overageCost'], errors='coerce').fillna(0)

    # Summarize usage
    summary = summarize_usage(api_df, ws_df, overage_df)

    # Apply usage filter if specified
    if args.f > 0:
        usage_filter = args.f * 1_000_000
        summary = summary[summary['Total Usage'] >= usage_filter]

    # Filter by email substring if --m is specified
    if args.m:
        summary = summary[summary['email'].str.contains(args.m, case=False, na=False)]

    # Filter by emails list if provided
    if args.emails:
        summary = summary[summary['email'].isin(args.emails)]

    # Filter by watch list if --w is specified
    if args.w:
        emails_watchlist = load_watch_list("./watch-list.txt")
        summary = summary[summary['email'].isin(emails_watchlist)]

    # Reset index for consistent ranking display from 1 to n
    summary = summary.reset_index(drop=True)

    # Display the filtered summary table
    print_table_with_usage(summary, show_overage=args.o)
    selected_number = input("\nEnter the number of the email to see the detailed summary, type 'y' to return to the menu, or 'n' to quit: ")

    while selected_number.isdigit():
        selected_index = int(selected_number) - 1
        if 0 <= selected_index < len(summary):
            selected_email = summary.iloc[selected_index]['email']
            show_details(api_df, ws_df, selected_email)
        selected_number = input("\nEnter another number, 'y' to return to the menu, or 'n' to quit: ")

if __name__ == "__main__":
    main()
