// ignore_for_file: avoid_print
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:async';
import 'dart:math';
import 'package:geolocator/geolocator.dart';
import 'login_screen.dart';

class HomeScreen extends StatefulWidget {
  final int userId;
  final String userName;

  const HomeScreen({
    super.key, 
    required this.userId, 
    required this.userName
  }); 

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  bool isLoading = true;
  
  // Dashboard state
  bool isOnDuty = false;
  int? activeSessionId;
  String? startTime;
  int durationMinutes = 0;
  double todaysDistanceKm = 0.0;
  
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    fetchDashboardData();
    // Refresh data every 30 seconds
    _timer = Timer.periodic(const Duration(seconds: 30), (timer) {
      if (isOnDuty) {
        fetchDashboardData();
        _sendLocationPing();
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> fetchDashboardData() async {
    final url = Uri.parse('http://127.0.0.1:8000/api/employee/dashboard?user_id=${widget.userId}');
    try {
      final response = await http.get(url);
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          isOnDuty = data['is_on_duty'];
          activeSessionId = data['active_session_id'];
          startTime = data['start_time'];
          durationMinutes = data['duration_minutes'];
          todaysDistanceKm = data['todays_distance_km']?.toDouble() ?? 0.0;
          isLoading = false;
        });
      }
    } catch (e) {
      print('Error fetching dashboard: $e');
      setState(() {
        isLoading = false;
      });
    }
  }

  Future<void> _sendLocationPing() async {
    if (activeSessionId == null) return;
    
    try {
      Position position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
      );
      
      final url = Uri.parse('http://127.0.0.1:8000/api/location');
      await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'session_id': activeSessionId,
          'latitude': position.latitude,
          'longitude': position.longitude,
          'timestamp': DateTime.now().toUtc().toIso8601String()
        }),
      );
    } catch (e) {
      print('Error sending location ping: $e');
    }
  }

  Future<void> _simulateLocationPing() async {
    if (activeSessionId == null) return;
    
    try {
      // Simulate movement by adding a random offset
      final random = Random();
      
      Position position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
      );
      
      final latOffset = (random.nextDouble() - 0.5) * 0.01;
      final lngOffset = (random.nextDouble() - 0.5) * 0.01;

      final url = Uri.parse('http://127.0.0.1:8000/api/location');
      await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'session_id': activeSessionId,
          'latitude': position.latitude + latOffset,
          'longitude': position.longitude + lngOffset,
          'timestamp': DateTime.now().toUtc().toIso8601String()
        }),
      );
      
      await fetchDashboardData(); // Refresh UI instantly to show new distance
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Simulated GPS Ping sent!")),
      );
    } catch (e) {
      print('Error sending simulated location ping: $e');
    }
  }

  Future<void> startDuty() async {
    setState(() => isLoading = true);
    try {
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text("Location permissions are required.")),
          );
          setState(() => isLoading = false);
          return;
        }
      }

      Position position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
      );
      
      final url = Uri.parse('http://127.0.0.1:8000/start-session'); 
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'employee_id': widget.userId,
          'status': 'active',
          'latitude': position.latitude,
          'longitude': position.longitude
        }),
      );
      
      if (response.statusCode == 200) {
        await fetchDashboardData();
      } else {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text("Failed to start duty: ${response.body}")),
        );
      }
    } catch (e) {
      print('Error starting duty: $e');
    } finally {
      setState(() => isLoading = false);
    }
  }

  Future<void> stopDuty() async {
    if (activeSessionId == null) return;
    
    setState(() => isLoading = true);
    try {
      final url = Uri.parse('http://127.0.0.1:8000/api/stop/$activeSessionId'); 
      final response = await http.post(url);
      
      if (response.statusCode == 200) {
        await fetchDashboardData();
      } else {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text("Failed to stop duty: ${response.body}")),
        );
      }
    } catch (e) {
      print('Error stopping duty: $e');
    } finally {
      setState(() => isLoading = false);
    }
  }

  void logout() {
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (context) => const LoginScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (isLoading && startTime == null) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    int hours = durationMinutes ~/ 60;
    int mins = durationMinutes % 60;
    
    String formattedTime = '--:--';
    if (startTime != null) {
      String st = startTime!;
      if (!st.endsWith('Z')) st += 'Z'; // Force UTC interpretation
      DateTime dt = DateTime.parse(st).toLocal();
      formattedTime = TimeOfDay.fromDateTime(dt).format(context);
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text("Employee Dashboard"),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: logout,
          )
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Welcome Section
            Text(
              "👤 Welcome, ${widget.userName}",
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            const Text(
              "Role: Field Executive",
              style: TextStyle(fontSize: 16, color: Colors.grey),
            ),
            
            const SizedBox(height: 30),
            
            // Status Card
            Card(
              elevation: 4,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text("Status:", style: TextStyle(color: Colors.grey, fontSize: 14)),
                    const SizedBox(height: 4),
                    Text(
                      isOnDuty ? "🟢 On Duty" : "🔴 Off Duty",
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: isOnDuty ? Colors.green : Colors.red,
                      ),
                    ),
                    
                    const Divider(height: 30),
                    
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text("Started at:", style: TextStyle(color: Colors.grey, fontSize: 14)),
                            const SizedBox(height: 4),
                            Text(
                              isOnDuty ? formattedTime : "--:--",
                              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            const Text("Duration:", style: TextStyle(color: Colors.grey, fontSize: 14)),
                            const SizedBox(height: 4),
                            Text(
                              isOnDuty ? "${hours}h ${mins}m" : "0h 0m",
                              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                      ],
                    ),
                    
                    const Divider(height: 30),
                    
                    const Text("Today's Distance:", style: TextStyle(color: Colors.grey, fontSize: 14)),
                    const SizedBox(height: 4),
                    Text(
                      "${todaysDistanceKm.toStringAsFixed(2)} km",
                      style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
            ),
            
            const SizedBox(height: 40),
            
            // Action Buttons
            if (!isOnDuty)
              ElevatedButton(
                onPressed: isLoading ? null : startDuty,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.blue,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  textStyle: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                child: isLoading ? const CircularProgressIndicator(color: Colors.white) : const Text("Start Duty"),
              )
            else
              Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  ElevatedButton(
                    onPressed: isLoading ? null : stopDuty,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.red,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      textStyle: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    child: isLoading ? const CircularProgressIndicator(color: Colors.white) : const Text("Stop Duty"),
                  ),
                  const SizedBox(height: 16),
                  OutlinedButton.icon(
                    onPressed: isLoading ? null : _simulateLocationPing,
                    icon: const Icon(Icons.location_on),
                    label: const Text("Simulate GPS Ping"),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    "(For testing: Sends a random coordinate to increase distance)",
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 12, color: Colors.grey),
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }
}