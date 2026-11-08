package com.manafishrov.mobile

import android.content.Context
import android.net.ConnectivityManager
import android.net.InetAddresses
import android.net.LinkAddress
import android.net.LinkProperties
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import java.net.InetAddress

/**
 * Android never makes an ethernet link without internet the default network,
 * so with Wi-Fi or mobile data up, traffic to the ROV would leave over those.
 * While a USB-C ethernet network whose subnet contains the ROV address is
 * connected, bind the whole app (Rust sockets and the WebView) to it.
 */
internal class RovNetwork(context: Context) {
  private val connectivity = context.getSystemService(ConnectivityManager::class.java)
  private val ethernetLinks = mutableMapOf<Network, LinkProperties>()
  private var rovAddress: InetAddress? = null
  private var boundNetwork: Network? = null
  private var callback: ConnectivityManager.NetworkCallback? = null

  @Synchronized
  fun setAddress(address: String) {
    rovAddress =
      if (InetAddresses.isNumericAddress(address)) InetAddresses.parseNumericAddress(address)
      else null
    if (callback == null) {
      register()
    }
    updateBinding()
  }

  @Synchronized
  fun release() {
    callback?.let { connectivity.unregisterNetworkCallback(it) }
    callback = null
    ethernetLinks.clear()
    updateBinding()
  }

  private fun register() {
    val request =
      NetworkRequest.Builder()
        .addTransportType(NetworkCapabilities.TRANSPORT_ETHERNET)
        .removeCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
        .build()
    val networkCallback =
      object : ConnectivityManager.NetworkCallback() {
        override fun onLinkPropertiesChanged(network: Network, properties: LinkProperties) {
          synchronized(this@RovNetwork) {
            ethernetLinks[network] = properties
            updateBinding()
          }
        }

        override fun onLost(network: Network) {
          synchronized(this@RovNetwork) {
            ethernetLinks.remove(network)
            updateBinding()
          }
        }
      }
    connectivity.registerNetworkCallback(request, networkCallback)
    callback = networkCallback
  }

  private fun updateBinding() {
    val address = rovAddress
    val target =
      address?.let {
        ethernetLinks.entries
          .firstOrNull { (_, properties) ->
            properties.linkAddresses.any { link -> link.contains(address) }
          }
          ?.key
      }
    if (target != boundNetwork) {
      connectivity.bindProcessToNetwork(target)
      boundNetwork = target
    }
  }
}

private fun LinkAddress.contains(address: InetAddress): Boolean {
  val network = this.address.address
  val candidate = address.address
  if (network.size != candidate.size) {
    return false
  }
  var remaining = prefixLength
  for (index in network.indices) {
    if (remaining <= 0) {
      return true
    }
    val bits = minOf(remaining, 8)
    val mask = (0xFF shl (8 - bits)) and 0xFF
    if ((network[index].toInt() and mask) != (candidate[index].toInt() and mask)) {
      return false
    }
    remaining -= bits
  }
  return true
}
